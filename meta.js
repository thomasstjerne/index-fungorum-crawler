module.exports = pubDate => `# Full dataset title
title: Index Fungorum API crawl


# Multi parapgraph description / abstract of the dataset
description: | 
    The Index Fungorum, the global fungal nomenclator coordinated and supported by the Index Fungorum Partnership, contains names of fungi (including yeasts, lichens, chromistan fungal analogues, protozoan fungal analogues and fossil forms) at all ranks.

# Official release date of this version in ISO YYYY-MM-DD. Will be part of the default citation!
issued: ${pubDate}     


contact: 
  given: Thomas
  family: Stjernegaard Jeppesen
  email: tsjeppesen@gbif.org

# Creators of the dataset. Will be treated as authors in the default citation!
# For available fields see Agent type at the top
# Please provide an ORCID if you can so it can be included in DOI metadata
creator:
  - given: Paul
    family: Kirk
    orcid: 0000-0002-0658-7338

# Editors of the dataset. Will be part of the default citation!
editor:
  - given: Paul
    family: Kirk
    orcid: 0000-0002-0658-7338

# Single publishing organisation. Will be part of the default citation!
publisher:         
  organisation: Royal Botanic Gardens, Kew   
  city: London
  country: Great Britain



# Description of the geographical scope of the dataset
geographicScope: global

# Taxonomic scope of the dataset
taxonomicScope: Fungi

# Taxonomic scope of the dataset given as English vernacular name(s)
taxonomicScopeInEnglish: Fungi


# Any commons license (CC0, CC-BY, CC-BY-NC, CC-BY-SA, CC-BY-ND, CC-BY-NC-SA, CC-BY-NC-ND)
# Must be CC0 or CC-BY to be used by COL !!!
license: CC-BY

# Link to a website for the dataset
url: http://www.indexfungorum.org

# URL to large logo image
logo: http://www.indexfungorum.org/IMAGES/LogoIF.gif
`