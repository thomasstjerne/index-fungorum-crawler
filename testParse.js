const fs = require("fs");
const _ = require('lodash')

const crawl = require('./crawl')
const parse = require('./parse')
const getEml = require('./eml')
const getYaml = require('./meta')

const writeMeta = (format) => {
    console.log(`Writing metadata ${format === 'coldp' ? 'yaml': 'eml'}`)
      let pubDate = new Date().toISOString().split('T')[0];
      const metadata = format === 'coldp' ? getYaml(pubDate) : getEml(pubDate);
      const fileName = format === 'coldp' ? 'metadata.yaml' : 'eml.xml';
      const eml = getEml(pubDate)
      fs.writeFile(__dirname + `/data/${fileName}`, metadata, 'utf8', (err)=>{
        if(err){
          console.log(err)
          // the build must fail if no eml
          throw err
        } else {
          console.log(`Metadata written to ${fileName}. PubDate ${pubDate}`)
        }
      })
}
const FORMATS = ['dwc', 'coldp']
const format =  'coldp'//_.get(process.argv.slice(2), '[0]');
if(!FORMATS.includes(format)){
  console.log(
    "Please provide a valid format, options are: " +
    FORMATS.join(", ")
  );
  exit();
} else {
  writeMeta(format)
    parse.coldp() //parse[format]//crawl().then(parse[format])
};