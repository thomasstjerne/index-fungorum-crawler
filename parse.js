
const fs = require("fs");
const parse = require("csv-parse");
const transform = require("stream-transform");
const _ = require('lodash')
const doiRegex = require('doi-regex');
const typeStatus = require('./typeStatus.json')
const invalstatus = require('./invalstatus.json')
const coldpColumns = require('./coldpColumns')
const PARENT_ID = new Map();
const SPECIES_NAME_TO_ID = new Map();
const SPECIES_SYN_TO_ID = new Map();
const GENUS_TO_ID = new Map();
const FAMILY_TO_ID = new Map();
const ORDER_TO_ID = new Map();
const SUBCLASS_TO_ID = new Map();
const CLASS_TO_ID = new Map();
const SUBPHYLUM_TO_ID = new Map();
const PHYLUM_TO_ID = new Map();
const KINGDOM_TO_ID = new Map();
const IF_HIGHER_RANKS = ["Genus_x0020_name", "Family_x0020_name" , "Order_x0020_name", "Subclass_x0020_name", "Class_x0020_name","Subphylum_x0020_name", "Phylum_x0020_name", "Kingdom_x0020_name" ]
const SYNONYM_GENUS_TO_ID = new Map()
const IF_HIGHER_RANKS_DATA = {
    "Genus_x0020_name": GENUS_TO_ID, 
    "Family_x0020_name": FAMILY_TO_ID , 
    "Order_x0020_name": ORDER_TO_ID, 
    "Subclass_x0020_name": SUBCLASS_TO_ID, 
    "Class_x0020_name": CLASS_TO_ID,
    "Subphylum_x0020_name": SUBPHYLUM_TO_ID, 
    "Phylum_x0020_name": PHYLUM_TO_ID, 
    "Kingdom_x0020_name": KINGDOM_TO_ID
}
const RANKS = {
    "gen.": {name: "genus", data: GENUS_TO_ID, parent: "Family_x0020_name" },
    "fam.": {name: "family", data: FAMILY_TO_ID, parent: "Order_x0020_name"},
    "ord.": {name: "order", data: ORDER_TO_ID, parent: "Subclass_x0020_name"},
    "subclass." : {name: "subclass", data: SUBCLASS_TO_ID, parent: "Class_x0020_name"},
    "class." : {name: "class", data: CLASS_TO_ID, parent: "Subphylum_x0020_name"},
    "subphyl.": {name: "subphylum", data: SUBPHYLUM_TO_ID, parent: "Phylum_x0020_name"},
    "phyl.": {name: "phylum", data: PHYLUM_TO_ID, parent:  "Kingdom_x0020_name"},
    "regn.": {name: "kingdom", data: KINGDOM_TO_ID, parent: null}
}

const INFRASPECIFIC_RANKS = {
    'subsp.': 'subspecies',
    'var.': 'variety', 
    'f.': 'form', 
    'f.sp.': 'forma specialis'
}
const INF_RANKS = Object.keys(INFRASPECIFIC_RANKS);

const ALL_RANKS = {
    "subgen." : {name:"subgenus"},
    "sect.": {name:"section"},
    "trib.": {name:"tribe"},
    "subsect." : {name:"subsection"},
    "ser." : {name:"series"},
    "subser.": {name:"subseries"},
    "subord.": {name:"suborder"},
    "subtrib." : {name:"subtribe"},
    "subfam.": {name:"subfamily"},
    "subregn." : {name:"subkingdom"},
    "superphyl.": {name:"superphylum"},
    "superclass.": {name:"superclass"},
    "superfam.": {name:"superfamily"},
    ...RANKS
}

const url = "http://www.indexfungorum.org/Names/NamesRecord.asp?RecordID="

const getPublishedIn = (record) => {

    const authors = record?.PUBLISHING_x0020_AUTHORS ? `${record?.PUBLISHING_x0020_AUTHORS}. ` : "";
    const publication = record?.pubAcceptedTitle || record?.pubOriginalTitle 
    const year = record?.YEAR_x0020_OF_x0020_PUBLICATION ? ` (${record?.YEAR_x0020_OF_x0020_PUBLICATION}).` : ''
    const volAndPage = record?.PAGE ? ` ${record?.VOLUME || ""}${record?.PART ? "("+record?.PART+")": ""}${ record?.VOLUME || record?.PART ? ": ":""}${record?.PAGE}.` : '';
    return publication ? `${authors}In: ${publication}${volAndPage}${year}` : '';
}

const shouldWriteParent = record => RANKS[record?.INFRASPECIFIC_x0020_RANK] && isAcceptedTaxon(record)

const isAcceptedTaxon = record => {
    if(record?.EDITORIAL_x0020_COMMENT && record?.EDITORIAL_x0020_COMMENT.startsWith('DEPRECATED RECORD')){
        return false
    } else {
        return !record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER || (record?.RECORD_x0020_NUMBER === record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER);
    }
} 
let parentNamesProccessed = 0;

// const ALL_RANKS = new Set();

const readParents = async (inputStream) => {
    const parser = parse({
      delimiter: "\t",
      columns: true,
      ltrim: true,
      rtrim: true,
      quote: null,
      relax_column_count: true,
    });
   
    const transformer = transform(function(record, callback){
       // ALL_RANKS.add(record?.INFRASPECIFIC_x0020_RANK)
        if(shouldWriteParent(record)){
            RANKS[record?.INFRASPECIFIC_x0020_RANK].data.set(record?.NAME_x0020_OF_x0020_FUNGUS, record?.RECORD_x0020_NUMBER)
            parentNamesProccessed ++;
            if ( (parentNamesProccessed % 1000) === 0 ){
                console.log(`${parentNamesProccessed} parent names in map`)
            }
        } else if(record?.INFRASPECIFIC_x0020_RANK === "gen." && record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER && record?.RECORD_x0020_NUMBER !== record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER){
            SYNONYM_GENUS_TO_ID.set(record?.NAME_x0020_OF_x0020_FUNGUS, record?.RECORD_x0020_NUMBER)
        }
        callback(null, null)
    }, {
      parallel: 5
    })
    
    inputStream.pipe(parser).pipe(transformer).pipe(fs.createWriteStream('/dev/null'))
  };

  let parentLinksProccessed = 0;

  const makeParentLinks = async (inputStream) => {
    const parser = parse({
      delimiter: "\t",
      columns: true,
      ltrim: true,
      rtrim: true,
      quote: null,
      relax_column_count: true,
    });
   
    const transformer = transform(function(record, callback){
        if(record?.INFRASPECIFIC_x0020_RANK === "sp."){
            IF_HIGHER_RANKS.forEach(rank => {
                let pidx = IF_HIGHER_RANKS.indexOf(rank) +1;
                // skip Insertae Sedis parents
                while(["Incertae sedis", "Fossil Fungi", "Fossil Ascomycota"].includes(record[IF_HIGHER_RANKS[pidx]])){
                    pidx++
                }
                if( pidx < IF_HIGHER_RANKS.length && record[rank] && record[IF_HIGHER_RANKS[pidx]]){
                    let pRank = IF_HIGHER_RANKS[pidx];
                    const parentId = IF_HIGHER_RANKS_DATA[pRank].get(record[pRank]);
                    const id = IF_HIGHER_RANKS_DATA[rank].get(record[rank])
                    PARENT_ID.set(id, parentId)
                }
            })
            // we want species IDs as parents for subspecies, varieties and forms
            if(isAcceptedTaxon(record)){
                SPECIES_NAME_TO_ID.set(`${record?.Genus_x0020_name}_${record?.SPECIFIC_x0020_EPITHET}`, record.RECORD_x0020_NUMBER)
            } else {
                SPECIES_SYN_TO_ID.set(`${record?.Genus_x0020_name}_${record?.SPECIFIC_x0020_EPITHET}`, record.RECORD_x0020_NUMBER)
            }
            parentLinksProccessed ++;
            if ((parentLinksProccessed % 10000) === 0){
                console.log(`Extracted parent links from ${parentLinksProccessed} species`)
            }
            
        }
        callback(null, null)
    }, {
      parallel: 5
    })
    
    inputStream.pipe(parser).pipe(transformer).pipe(fs.createWriteStream('/dev/null'))
  };
/* let profileStream =  fs.createWriteStream(`data/speciesProfile.txt`, {
    flags: 'a' 
  }) */
const writeExtinct = (record, profileStream) => {
    if( ["Fossil Ascomycota", "Fossil Fungi"].includes(record?.Phylum_x0020_name)){
        profileStream.write(`${record?.RECORD_x0020_NUMBER}\tTRUE\n`)
    }
}

const isExtinct = (record) => {
   return ["Fossil Ascomycota", "Fossil Fungi"].includes(record?.Phylum_x0020_name)
    
}

const getTaxonRemarks = record => {

    if(isAcceptedTaxon(record) && record?.Genus_x0020_name && [...INF_RANKS, "sp."].includes(record?.INFRASPECIFIC_x0020_RANK) && !GENUS_TO_ID.get(record?.Genus_x0020_name) ){
        return `No accepted genus "${record?.Genus_x0020_name}" found in Index Fungorum for this accepted ${record?.INFRASPECIFIC_x0020_RANK === 'sp.' ? "species" : INFRASPECIFIC_RANKS[record?.INFRASPECIFIC_x0020_RANK]}`
    } else {
        return ""
    }
    
};
// const NOMSTATUS = new Set()
const getNomStatus = record => {
   /*  if(record?.NOMENCLATURAL_x0020_COMMENT){
        NOMSTATUS.add(record?.NOMENCLATURAL_x0020_COMMENT.split(",")[0])
    } */
    
    return record?.NOMENCLATURAL_x0020_COMMENT ? record?.NOMENCLATURAL_x0020_COMMENT.split(",")[0] : ""
};

const getColdpStatus = (record) => {
   
        if(record?.EDITORIAL_x0020_COMMENT && record?.EDITORIAL_x0020_COMMENT.startsWith('DEPRECATED RECORD')){
            return "bare name"
        } else if (!record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER || (record?.RECORD_x0020_NUMBER === record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER)) {
            return invalstatus.includes(getNomStatus(record)) ? "bare name" : "accepted"
        } else {
            return "synonym"
        }
    
}

let taxaWritten = 0;
  const writeTaxa = async (inputStream, outputStream, profileStream) => {
    const parser = parse({
      delimiter: "\t",
      columns: true,
      ltrim: true,
      rtrim: true,
      quote: null,
      relax_column_count: true,
    });
   
    const transformer = transform(function(record, callback){
        let row = null;
        if(shouldWriteParent(record)){
            let parentId = PARENT_ID.get(record?.RECORD_x0020_NUMBER);
            if(parentId || record?.INFRASPECIFIC_x0020_RANK === "regn.") {
                row = `${record?.RECORD_x0020_NUMBER}\t${parentId || ''}\t${record?.RECORD_x0020_NUMBER}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\t${RANKS[record?.INFRASPECIFIC_x0020_RANK].name}\t\t${getPublishedIn(record)}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\n`  // TODO all needed data
            }
        } else if(INF_RANKS.includes(record?.INFRASPECIFIC_x0020_RANK)){         
            let parentId;
            let acceptedId = record?.RECORD_x0020_NUMBER;
            if(isAcceptedTaxon(record)){
                parentId = SPECIES_NAME_TO_ID.get(`${record?.Genus_x0020_name}_${record?.SPECIFIC_x0020_EPITHET}`);
            } else {
                parentId = SPECIES_SYN_TO_ID.get(`${record?.Genus_x0020_name}_${record?.SPECIFIC_x0020_EPITHET}`);
                acceptedId = record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
            }
            row = `${record?.RECORD_x0020_NUMBER}\t${parentId || ''}\t${acceptedId}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\t${INFRASPECIFIC_RANKS[record?.INFRASPECIFIC_x0020_RANK]}\t${record?.BASIONYM_x0020_RECORD_x0020_NUMBER || ''}\t${getPublishedIn(record)}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\n`
            writeExtinct(record, profileStream)
        } else if( record?.INFRASPECIFIC_x0020_RANK === 'sp.'){
            let parentId;
            let acceptedId = record?.RECORD_x0020_NUMBER;
            if(isAcceptedTaxon(record)){
                parentId = GENUS_TO_ID.get(record?.Genus_x0020_name);
                if(!parentId){
                    //SYNONYM_GENERA.add(record?.Genus_x0020_name)
                    parentId = SYNONYM_GENUS_TO_ID.get(record?.Genus_x0020_name)
                }
            } else {
                acceptedId = record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
            }
            
            row = `${record?.RECORD_x0020_NUMBER}\t${parentId || ''}\t${acceptedId}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\tspecies\t${record?.BASIONYM_x0020_RECORD_x0020_NUMBER || ''}\t${getPublishedIn(record)}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\n`
            writeExtinct(record, profileStream)
        } else if( record?.INFRASPECIFIC_x0020_RANK === 'gen.'){
            // include synonym genera
            let acceptedId = record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;    
            if(acceptedId){
                row = `${record?.RECORD_x0020_NUMBER}\t${''}\t${acceptedId}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\tgenus\t${record?.BASIONYM_x0020_RECORD_x0020_NUMBER || ''}\t${getPublishedIn(record)}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\n`
            }
            
        }
        if(record?.NAME_x0020_OF_x0020_FUNGUS === "UNPUBLISHED NAME" || record?.EDITORIAL_x0020_COMMENT === "DEPRECATED RECORD - please do not try to interpret any data on this page or on any of the linked pages"){
            row = null;
        }

        if(row){
            taxaWritten++
        }
        if ((taxaWritten % 10000) === 0){
            console.log(`${taxaWritten} taxa written to file`)
        }
        
        callback(null, row || "")
    }, {
      parallel: 5
    })
    
    inputStream.pipe(parser).pipe(transformer).pipe(outputStream)
  };
  const writeColDPReference = (record, referenceWriteStream) => {
    // ['ID', 'author', 'containerTitle','year','page', 'volume', 'issue', 'citation', 'isbn', 'issn', 'doi', 'link']

    const authors = record?.PUBLISHING_x0020_AUTHORS ? `${record?.PUBLISHING_x0020_AUTHORS}. ` : "";
    const publication = record?.pubAcceptedTitle || record?.pubOriginalTitle 
    const year = record?.YEAR_x0020_OF_x0020_PUBLICATION ? ` (${record?.YEAR_x0020_OF_x0020_PUBLICATION}).` : ''
    const volAndPage = record?.PAGE ? ` ${record?.VOLUME || ""}${record?.PART ? "("+record?.PART+")": ""}${ record?.VOLUME || record?.PART ? ": ":""}${record?.PAGE}.` : '';
    // On newer IF records, DOIs are hidden in the PAGE field
    let doi = record?.PAGE ? (record?.PAGE.trim().match(doiRegex())?.[0] || "") : "";
    if(doi.endsWith(",")){
        doi = doi.slice(0, -1)
    }
    let page = record?.PAGE || '';
    if(doi){
        let splitted = record?.PAGE.split(', ');
        if(splitted.length > 1){
            page = splitted[1].replace(/[\]\[]]/g)
        }
    }
    if(publication) {
        const citation = `${authors}In: ${publication}${volAndPage}${year}`;
        referenceWriteStream.write(`${record?.RECORD_x0020_NUMBER}\t${record?.PUBLISHING_x0020_AUTHORS || ''}\t${publication}\t${record?.YEAR_x0020_OF_x0020_PUBLICATION || ''}\t${page || ''}\t${record.VOLUME || ''}\t${record?.PART || ''}\t${citation}\t${record?.pubISBN || ""}\t${record?.pubISSN || ""}\t${doi}\t\n`)
        return record?.RECORD_x0020_NUMBER;
    } else {
        return "";
    }

  }

  const TYPE = new Set(typeStatus.map(t => t.name));

  const writeColDPTypeMaterial = (record, typeMaterialWriteStream) => {
      if(record?.TYPIFICATION_x0020_DETAILS && [...INF_RANKS, "sp."].includes(record?.INFRASPECIFIC_x0020_RANK)){
          let splitted = record?.TYPIFICATION_x0020_DETAILS.split(" ");
          let status = TYPE.has(splitted[0].trim().toLowerCase()) ? splitted[0] : "";
          let splitted2 = record?.TYPIFICATION_x0020_DETAILS.split("|");
          let associatedSequences = splitted2.length === 2 && splitted2[1].startsWith("http://www.ncbi.nlm.nih.gov/nuccore/") ? splitted2[1] : "";
          const citation = record?.LOCATION ? `${record?.TYPIFICATION_x0020_DETAILS}, ${record?.LOCATION}`: record?.TYPIFICATION_x0020_DETAILS;
          typeMaterialWriteStream.write(`${record?.RECORD_x0020_NUMBER}\t${status}\t${citation}\t${associatedSequences}\n`)
      }
}
    const writeColDPNameRelation = (record, nameRelationWriteStream) => {

        if(record?.TYPIFICATION_x0020_DETAILS){
            let splitted = record?.TYPIFICATION_x0020_DETAILS.split("$")
            if(splitted.length > 1 && !isNaN(splitted[0])){
                nameRelationWriteStream.write(`${record?.RECORD_x0020_NUMBER}\t${splitted[0]}\tTYPE\n`)
            }
        }
        // 108393$
    }
  const writeTaxaColDP = async (inputStream, outputStream, referenceWriteStream, typeMaterialWriteStream, nameRelationWriteStream) => {

    const parser = parse({
      delimiter: "\t",
      columns: true,
      ltrim: true,
      rtrim: true,
      quote: null,
      relax_column_count: true,
    });
   // ['ID','parentID','scientificName','authorship','rank','basionymID', 'status', 'link', 'remarks', 'nameStatus','nameRemarks', 'namePublishedInPageLink', 'extinct', 'referenceID', 'nameReferenceID'],
    const transformer = transform(function(record, callback){
        const namePublishedInPageLink = record?.CORRECTION ? record?.CORRECTION.replace(/\$[A-Z]http:/g, "http:") : "";
        const status = getColdpStatus(record);
        const extinct = isExtinct(record)
        const ID = record?.RECORD_x0020_NUMBER;
        let row = null;
        if(record?.NAME_x0020_OF_x0020_FUNGUS === "UNPUBLISHED NAME" || record?.EDITORIAL_x0020_COMMENT === "DEPRECATED RECORD - please do not try to interpret any data on this page or on any of the linked pages"){
            row = null;
        }
        else if(shouldWriteParent(record)){
            let parentId = PARENT_ID.get(record?.RECORD_x0020_NUMBER);
            if(parentId || record?.INFRASPECIFIC_x0020_RANK === "regn.") {
                let referenceID = writeColDPReference(record, referenceWriteStream);
                row = `${ID}\t${parentId || ''}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\t${RANKS[record?.INFRASPECIFIC_x0020_RANK].name}\t\t${status}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\t${record?.NOMENCLATURAL_x0020_COMMENT || ''}\t${namePublishedInPageLink}\t${extinct}\t${referenceID}\t${referenceID}\n`  // TODO all needed data
                
               // writeColDPTypeMaterial(record, typeMaterialWriteStream)
                writeColDPNameRelation(record, nameRelationWriteStream)
            }
        } else if(INF_RANKS.includes(record?.INFRASPECIFIC_x0020_RANK)){         
            let parentId = isAcceptedTaxon(record) ?  SPECIES_NAME_TO_ID.get(`${record?.Genus_x0020_name}_${record?.SPECIFIC_x0020_EPITHET}`) : record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
            let referenceID =  writeColDPReference(record, referenceWriteStream)
            row = `${ID}\t${parentId || ''}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\t${INFRASPECIFIC_RANKS[record?.INFRASPECIFIC_x0020_RANK]}\t${record?.BASIONYM_x0020_RECORD_x0020_NUMBER || ''}\t${status}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\t${record?.NOMENCLATURAL_x0020_COMMENT || ''}\t${namePublishedInPageLink}\t${extinct}\t${referenceID}\t${referenceID}\n`
           // writeColDPReference(record, referenceWriteStream)
            writeColDPTypeMaterial(record, typeMaterialWriteStream)

        } else if( record?.INFRASPECIFIC_x0020_RANK === 'sp.'){
            let parentId = isAcceptedTaxon(record) ? GENUS_TO_ID.get(record?.Genus_x0020_name) : record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;//SYNONYM_GENUS_TO_ID.get(record?.Genus_x0020_name)
            
            let referenceID =  writeColDPReference(record, referenceWriteStream)
            row = `${ID}\t${parentId || ''}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\tspecies\t${record?.BASIONYM_x0020_RECORD_x0020_NUMBER || ''}\t${status}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\t${record?.NOMENCLATURAL_x0020_COMMENT || ''}\t${namePublishedInPageLink}\t${extinct}\t${referenceID}\t${referenceID}\n`
           // writeColDPReference(record, referenceWriteStream)
            writeColDPTypeMaterial(record, typeMaterialWriteStream)

        } else if((record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER && record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER !==ID) && ALL_RANKS[record?.INFRASPECIFIC_x0020_RANK] ){
            // include synonym taxa at all higher ranks 
            let acceptedId = record?.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;    
            if(acceptedId){
                let referenceID = writeColDPReference(record, referenceWriteStream)
                row = `${ID}\t${acceptedId}\t${record.NAME_x0020_OF_x0020_FUNGUS}\t${record?.AUTHORS || ''}\t${ALL_RANKS[record?.INFRASPECIFIC_x0020_RANK].name}\t${record?.BASIONYM_x0020_RECORD_x0020_NUMBER || ''}\t${status}\t${url+record?.RECORD_x0020_NUMBER}\t${getTaxonRemarks(record)}\t${getNomStatus(record)}\t${record?.NOMENCLATURAL_x0020_COMMENT || ''}\t${namePublishedInPageLink}\t${extinct}\t${referenceID}\t${referenceID}\n`
               // writeColDPReference(record, referenceWriteStream)
               // writeColDPTypeMaterial(record, typeMaterialWriteStream)
               writeColDPTypeMaterial(record, typeMaterialWriteStream)
                writeColDPNameRelation(record, nameRelationWriteStream)

            }
            
        }
        

        if(row){
            taxaWritten++
        }
        if ((taxaWritten % 10000) === 0){
            console.log(`${taxaWritten} taxa written to file`)
        }
        
        callback(null, row || "")
    }, {
      parallel: 5
    })
    
    inputStream.pipe(parser).pipe(transformer).pipe(outputStream)
  }; 

  const run = ()=>{
    let profileStream =  fs.createWriteStream(`data/speciesProfile.txt`, {
        flags: 'a' 
      })
    var parentReadStream = fs.createReadStream(`data/taxa.txt`);
   // var parentWriteStream =  fs.createWriteStream(`data/parents.txt`)
    parentReadStream.on('end',  () => {
       /* Now that we have a map of names to IDs for all accepted higher taxa, 
        we can go through all records at species rank, and make links to IDs for their higher classification 
        (i.e. we have to get the higher taxas parents, from the species of the higher taxa)
        */
        var linkStream = fs.createReadStream(`data/taxa.txt`);
        makeParentLinks(linkStream)
        linkStream.on('end', () => {
            // Now we should be able to make proper parent links for all taxa. Write the data:
            var taxonReadStream = fs.createReadStream(`data/taxa.txt`);
            var taxonWriteStream =  fs.createWriteStream(`data/taxon.txt`, {
                flags: 'a' 
              })
            writeTaxa(taxonReadStream, taxonWriteStream, profileStream)
            taxonWriteStream.on('finish', () => {
                console.log(`Found ${SYNONYM_GENUS_TO_ID.size} missing accepted genera`)
               
                /* var missingGenera = fs.createWriteStream(`data/missing_genera.txt`)
                for (const [key, value] of SYNONYM_GENUS_TO_ID.entries()) {
                    missingGenera.write(`${key}\t${value}`);
                  } */
                

            })
        })
        
    })
    
    // Creates a name to id link for all accepted higher taxa
    readParents(parentReadStream)

  }

  const runCOLDP = ()=>{

    var parentReadStream = fs.createReadStream(`data/taxa.txt`);
   // var parentWriteStream =  fs.createWriteStream(`data/parents.txt`)
    parentReadStream.on('end',  () => {
       /* Now that we have a map of names to IDs for all accepted higher taxa, 
        we can go through all records at species rank, and make links to IDs for their higher classification 
        (i.e. we have to get the higher taxas parents, from the species of the higher taxa)
        */
        var linkStream = fs.createReadStream(`data/taxa.txt`);
        makeParentLinks(linkStream)
        linkStream.on('end', () => {
            // Now we should be able to make proper parent links for all taxa. Write the data:
            var taxonReadStream = fs.createReadStream(`data/taxa.txt`);
            var nameUsageWriteStream =  fs.createWriteStream(`data/NameUsage.txt`, {
                flags: 'a' 
              })
              nameUsageWriteStream.write(coldpColumns.NameUsage.join("\t")+"\n")
              var referenceWriteStream =  fs.createWriteStream(`data/Reference.txt`, {
                flags: 'a' 
              })
              referenceWriteStream.write(coldpColumns.Reference.join("\t")+"\n")

              var typeMaterialWriteStream =  fs.createWriteStream(`data/TypeMaterial.txt`, {
                flags: 'a' 
              })
              typeMaterialWriteStream.write(coldpColumns.TypeMaterial.join("\t")+"\n")
              var nameRelationWriteStream =  fs.createWriteStream(`data/NameRelation.txt`, {
                flags: 'a' 
              })
              nameRelationWriteStream.write(coldpColumns.NameRelation.join("\t")+"\n")
              writeTaxaColDP(taxonReadStream, nameUsageWriteStream, referenceWriteStream, typeMaterialWriteStream, nameRelationWriteStream)
            nameUsageWriteStream.on('finish', () => {
                console.log(`Found ${SYNONYM_GENUS_TO_ID.size} missing accepted genera`)
                
               /*  var ws =  fs.createWriteStream(`data/nomstatus.json`, {
                    flags: 'a' 
                  })
                  ws.write(JSON.stringify([...NOMSTATUS], null, 2)) */
                /* var missingGenera = fs.createWriteStream(`data/missing_genera.txt`)
                for (const [key, value] of SYNONYM_GENUS_TO_ID.entries()) {
                    missingGenera.write(`${key}\t${value}`);
                  } */


                  /*   var ws =  fs.createWriteStream(`data/allranks.json`, {
                    flags: 'a' 
                  })
                  ws.write(JSON.stringify([...ALL_RANKS], null, 2))  */
                

            })
        })
        
    })
    
    // Creates a name to id link for all accepted higher taxa
    readParents(parentReadStream)

  }

  module.exports = {
      dwc: run,
      coldp: runCOLDP
  };
  
  //run()
  // runCOLDP()

