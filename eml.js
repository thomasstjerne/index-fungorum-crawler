module.exports = pubDate => `<eml:eml xmlns:eml="eml://ecoinformatics.org/eml-2.1.1"
xmlns:dc="http://purl.org/dc/terms/"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="eml://ecoinformatics.org/eml-2.1.1 http://rs.gbif.org/schema/eml-gbif-profile/1.1/eml.xsd"
packageId="e7483e65-9c47-4b18-9349-1e036fa8a22d/v1.8" system="http://gbif.org" scope="system"
xml:lang="eng">

<dataset>
<title xml:lang="eng">Index Fungorum - API crawl</title>  
<creator>
<individualName>
<givenName>Thomas Stjernegaard</givenName>
<surName>Jeppesen</surName>
</individualName>
<organizationName>GBIF</organizationName>
<address>
<deliveryPoint>Universitetsparken 15</deliveryPoint>
<city>Copenhagen</city>
<postalCode>2100</postalCode>
<country>DK</country>
</address>
<electronicMailAddress>tsjeppesen@gbif.org</electronicMailAddress>
<userId directory="http://orcid.org/">0000-0003-1691-239X</userId>
</creator>

<pubDate>
${pubDate}
</pubDate>
<language>en</language>
<abstract>
<para>Testing API crawler for Index Fungorum</para>
</abstract>

<distribution scope="document">
<online>
<url function="information">http://www.indexfungorum.org/</url>
</online>
</distribution>
<coverage>

 <taxonomicCoverage>
     <taxonomicClassification>
         <taxonRankName>kingdom</taxonRankName>
       <taxonRankValue>Fungi</taxonRankValue>
         <commonName>Fungi</commonName>
     </taxonomicClassification>
 </taxonomicCoverage>
</coverage>
<maintenance>
<description>
<para></para>
</description>
<maintenanceUpdateFrequency>asNeeded</maintenanceUpdateFrequency>
</maintenance>

<contact>
 <individualName>
<givenName>Thomas Stjernegaard</givenName>
<surName>Jeppesen</surName>
</individualName>
<organizationName>GBIF</organizationName>
<address>
<deliveryPoint>Universitetsparken 15</deliveryPoint>
<city>Copenhagen</city>
<postalCode>2100</postalCode>
<country>DK</country>
</address>
<electronicMailAddress>tsjeppesen@gbif.org</electronicMailAddress>
<userId directory="http://orcid.org/">0000-0003-1691-239X</userId>
</contact>


</dataset>

</eml:eml>`