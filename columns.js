
const clms = `NAME_x0020_OF_x0020_FUNGUS AUTHORS SPECIFIC_x0020_EPITHET INFRASPECIFIC_x0020_RANK TYPIFICATION_x0020_DETAILS HOST LOCATION VOLUME PAGE PART YEAR_x0020_OF_x0020_PUBLICATION EDITORIAL_x0020_COMMENT NOMENCLATURAL_x0020_COMMENT CORRECTION PUBLISHED_x0020_LIST_x0020_REFERENCE PUBLISHING_x0020_AUTHORS LITERATURE_x0020_LINK BSM_x0020_LINK RECORD_x0020_NUMBER BASIONYM_x0020_RECORD_x0020_NUMBER PROTONYM_x0020_RECORD_x0020_NUMBER NAME_x0020_OF_x0020_FUNGUS_x0020_FUNDIC_x0020_RECORD_x0020_NUMBER CURRENT_x0020_NAME CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER CURRENT_x0020_NAME_x0020_FUNDIC_x0020_RECORD_x0020_NUMBER GSD_x0020_FLAG TAXONOMIC_x0020_REFEREE UpdatedBy UpdatedDate UUID pubLink pubType pubOriginalTitle pubEdition pubPlaceOfPublication pubISBN pubISSN pubIMIAbbr pubPublishers pubAcceptedTitle Genus_x0020_name Family_x0020_name Order_x0020_name Subclass_x0020_name Class_x0020_name Subphylum_x0020_name Phylum_x0020_name Kingdom_x0020_name Authors1 Volume1 Page1 Year_x0020_of_x0020_Publication1 Day_x0020__x0026__x0020_Month_x0020_of_x0020_Publication Literature_x0020_Link1 ING_x0020_NCU_x0020_Record_x0020_Number Fundic_x0020_Record_x0020_Number Fundic_x0020_Record_x0020_Number NCU_x0020_Flag Current_x0020_Use IsUnique FUNINDEX_x0020_Record_x0020_Number_x0020_of_x0020_type_x0020_species UpdatedBy1 UpdatedDate1 timestamp`
// Make sure there are no duplicate columns
module.exports = [...new Set([...clms.split(" ")])]


