const fs = require("fs");
const rp = require("request-promise");
const _ = require("lodash");
const co = require("co");
const parseString = require("xml2js").parseString;
const columns = require("./columns");
const outputDir = 'data';
let taxonStream = fs.createWriteStream(`${outputDir}/taxa.txt`, {
  flags: "a",
});
taxonStream.write(`${columns.join("\t")}\n`);


const ERROR_IDS = new Set();

const concurrency = 10;
const maxId = 1100000;
let recordsFound = 0;
const extractRow = (record) =>
  columns.map((clm) => _.get(record, `${clm}[0]`, "")).join("\t") + "\n";

const getRecord = async (id) => {
  let retries = 0
  let done = false;
  return new Promise(async (resolve, reject) => {
    while(!done && retries <= 5){
    try {
      const recordAsXml = await rp(
        `http://www.indexfungorum.org/ixfwebservice/fungus.asmx/NameByKey?NameKey=${id}`
      );

      parseString(recordAsXml, { trim: true }, (error, record) => {
        if (error) {
          console.log("Error parsing XML");
          console.log(error);
          resolve(`Error parsing XML for record ${id}`);
          //reject(error);
        } else {
          let data = _.get(record, "NewDataSet.IndexFungorum[0]");
          if (data) {
            taxonStream.write(extractRow(data));
            if(ERROR_IDS.has(id)){
              ERROR_IDS.delete(id)
            }
            recordsFound ++;
          }
          done = true;
          resolve(id);
        }
      });
    } catch (err) {
      if(retries < 5){
        retries ++;

        console.log(`Error on ${id} retrying (${retries} of 5)`)
        // return getRecord(id)
      } else {
        ERROR_IDS.add(id);
        done = true;
        resolve(`WS error on record ${id}`);
        console.log(err)
      }    
    }
  }
  });
};

var numberOfRetriesOnErrorlist = 0;

const run = (idlist) => co(function* () {
  if(!idlist){
    // Simply traverse all ids up to maxId
    let offset = 1;
    while (offset <= maxId) {
      // create an array of the next series of ids
    let res = yield Array(concurrency)
      .fill()
      .map((element, index) => index + offset)
      .map(getRecord);
  //  console.log(res)
    offset += res.length;
    if (((offset -1) % 1000) === 0){
      console.log(`Traversed ${offset} of ${maxId} ids so far and found ${recordsFound} records`)
    } 
  }
  } else {
    let offset = 0;
    while (offset <= idlist.length) {
      // create an array of the next series of ids
    let res = yield idlist.slice(offset, Math.min(offset+concurrency, idlist.length))
      .map(getRecord);
      console.log(res)

    offset += concurrency;
    if ((offset % 1000) === 0){
      console.log(`Traversed ${offset} of ${idlist.length} errored ids`)
    } 
  }
  }
  
})
  .then(() => {
    if(ERROR_IDS.size > 0 && numberOfRetriesOnErrorlist < 10){
      console.log(`Num errors: ${ERROR_IDS.size}, retrying...`)
      numberOfRetriesOnErrorlist ++;
      run([...ERROR_IDS])
    } else {
      let errorsStream = fs.createWriteStream(`${outputDir}/errors.json`, {
        flags: "a",
      });
      errorsStream.write(JSON.stringify([...ERROR_IDS]));
    
    console.log(`Num errors after ${numberOfRetriesOnErrorlist} re-runs : ${ERROR_IDS.size}`);
    console.log(`Found ${recordsFound} in ${maxId} IDs`)
    }
   
  })
  .catch((err) => {
    console.log(err);
  });

// getRecord(827760);
module.exports = run;
// run()