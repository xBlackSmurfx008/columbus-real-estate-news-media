# CREN area-hub completion plan — 2026-08-25

## Current status — August 28, 2026

Sprint A baseline is implemented and deployed at `3fc9ba8`. The 86 declared
hubs have their baseline image, local-living, housing-action, directory, and
official-source states. Follow-on discovery work also shipped intent-aware
search/resource results, saved items, and area-scoped housing links.

Sprint B is not complete. The source-aware market tables are installed and
contain 20 verified observations across 11 geographies, including city-level
home values and rents, one neighborhood home-value row, and the national
mortgage series. No hub should be labeled fully reported until documentary-image
review, local source coverage, and the remaining usefulness-gate checks are
complete. Areas without a verified observation remain in pending-data mode.

## What is complete in this sprint

All 86 declared area hubs now have the same useful baseline instead of an empty-card state:

- a verified local article image when one exists, otherwise a labeled CREN representative editorial image;
- four live local-living cards: parks/trails, kids/daytime, food/coffee, and arts/events;
- four housing-action cards: buy, rent, sell, and list a rental;
- three directory cards: home services, local businesses, and list a business;
- current official activity-source links and a clear warning to verify schedules, boundaries, costs, credentials, and availability;
- separation among editorial coverage, free directory review, sponsored placement, and advertising.

This is **baseline completion**, not a claim that every hub already has a fully reported local directory. Generated images are representative and labeled. They must never be described as documentary photography of a named place. A verified, relevant local article image takes precedence.

## Usefulness gate for a fully reported hub

A hub advances from baseline to fully reported only after it has:

1. a boundary definition and crosswalk to municipality, ZIP, county, school district, and side of town;
2. sourced sale and rental observations with geography, property type, period, method, and limitation attached;
3. at least one original local article and one verified documentary image;
4. a curated set of parks, family/daytime activities, food, arts, entertainment, libraries, transit, groceries, and healthcare access points;
5. active development, zoning, public spending, and meeting sources;
6. current recurring and annual events with organizer links and last-verified dates;
7. directory listings with identity, service area, claims, credentials, and sponsor status reviewed;
8. follow-area conversion, corrections path, update owner, and next-review date;
9. mobile, accessibility, performance, structured-data, and indexation checks.

## Area-by-area editorial queue

The `First deep-dive` column defines the first distinctive reporting package. Every package still receives all usefulness-gate checks above.

| Area | Kind | Priority | First deep-dive |
| --- | --- | --- | --- |
| Columbus Citywide | Region | P0 | Metro events and parks calendar; family free/low-cost guide; housing-portal and service-directory source registry; five side-of-town crosswalks. |
| Bexley | City | P1 | Main Street food and retail, Jeffrey Mansion and city parks, Drexel-area entertainment, schools and housing costs, city meetings and infill. |
| Brice | City | P2 | Village boundary and address accuracy, nearby parks and family options, service access, housing stock, village records and adjacent-city dependencies. |
| Canal Winchester | City | P1 | Historic downtown, city parks and programs, nearby regional outdoor assets, annual events, restaurant openings, Fairfield/Franklin boundary and housing split. |
| Columbus | City | P0 | City recreation system, library and event feeds, housing/rent by side of town, zoning and council trackers, neighborhood crosswalk and service coverage. |
| Dublin | City | P0 | Bridge Park and Historic Dublin, parks and recreation, library/family programs, signature events, dining, development pipeline and three-county boundary. |
| Gahanna | City | P0 | Creekside area, city parks and trails, family programs, local food, events, airport-corridor development and housing/rent trends. |
| Grandview Heights | City | P1 | Grandview Avenue businesses, parks and library programs, entertainment, compact-city development, rent-versus-buy and Columbus boundary context. |
| Grove City | City | P1 | Town Center, parks and family recreation, food and events, growth corridors, new housing and infrastructure, commuter and service access. |
| Groveport | City | P1 | Historic core, recreation and aquatic programs, nearby trail/park access, logistics employment, housing growth, restaurants and community events. |
| Harrisburg | City | P2 | Village and county boundary, local parks/programs, daily services, rental and sale inventory limitations, public meetings and nearby regional amenities. |
| Hilliard | City | P0 | Old Hilliard and Station Park area, parks/trails, family recreation, food and markets, signature events, schools, development and multi-county edge context. |
| Marble Cliff | City | P2 | Village boundary, nearby Grandview services and attractions, parks access, housing turnover, governance, taxes and address-level school verification. |
| Minerva Park | City | P2 | Village lake/park setting, community events, nearby Northland services, housing stock, local governance and Columbus boundary relationships. |
| New Albany | City | P1 | Rose Run/Market area, parks and cultural programming, family activities, dining, major development, employment growth and Franklin/Licking boundary. |
| Obetz | City | P1 | Fortress Obetz and recreation, parks and family programs, community events, Rickenbacker-area growth, housing, local dining and transportation access. |
| Pickerington | City | P1 | Olde Village, parks and family recreation, nearby nature access, restaurants and events, development and Fairfield/Franklin boundary. |
| Reynoldsburg | City | P1 | Olde Reynoldsburg, city parks and recreation, Blacklick Woods access, family programs, retail corridors, housing and Franklin/Licking boundary. |
| Riverlea | City | P2 | Village boundary, nearby Worthington parks/services, housing turnover, schools, governance, taxes and walk/bike connections. |
| Upper Arlington | City | P0 | Northam and neighborhood parks, Lane Avenue, library and family programming, dining, arts/events, housing costs, redevelopment and schools. |
| Valleyview | City | P2 | Village boundary, nearby west-side parks and services, industrial/residential context, housing stock, governance and mobility. |
| Westerville | City | P0 | Uptown, parks and trails, family/library programs, arts and events, dining, development, housing/rent and Franklin/Delaware boundary. |
| Whitehall | City | P1 | Community parks and recreation, library/family programs, food and retail corridors, redevelopment, housing costs, mobility and public meetings. |
| Worthington | City | P0 | Historic Worthington and High Street, Village Green, parks/library, arts and markets, restaurants, development and housing turnover. |
| Blacklick | CDP/place | P1 | Exact place/ZIP boundary, Blacklick Woods and east-side park access, family services, rentals versus ownership, retail and Gahanna/Reynoldsburg context. |
| Blacklick Estates | CDP/place | P2 | Census-place boundary, local parks and schools, daily services, housing condition and affordability, transit and nearby municipal responsibilities. |
| Edgewater Park | CDP/place | P2 | Boundary validation, nearest parks/family programs, service access, housing stock, flood/environment context and responsible jurisdictions. |
| Galloway | CDP/place | P1 | Franklin/Madison boundary, Battelle Darby-area outdoor access, local services, rental houses, subdivisions, schools and west-side growth. |
| Hamilton Meadows | CDP/place | P2 | Boundary and naming validation, parks and daily services, housing stock, schools, transit, responsible jurisdictions and nearby hubs. |
| Huber Ridge | CDP/place | P2 | Census boundary, nearby parks and recreation, family services, housing stock, transit, Westerville/Columbus responsibilities and local meetings. |
| Lake Darby | CDP/place | P2 | Franklin/Madison boundary, water/flood and infrastructure context, nearby parks, housing stock, schools, services and responsible jurisdictions. |
| Lithopolis | CDP/place | P2 | Fairfield/Franklin context, village services, parks and events, housing growth, schools and accurate jurisdiction labels. |
| Lockbourne | CDP/place | P2 | Franklin/Pickaway context, village boundary, nearby recreation, Rickenbacker/logistics impacts, housing and service availability. |
| Mount Air | CDP/place | P2 | Place-name and boundary validation, nearby park access, housing stock, utilities/services, school district and county/city responsibilities. |
| New Rome | CDP/place | P2 | Historical/current place status, Prairie Township services, parks, housing, schools, governance and accurate naming on listings. |
| Orient | CDP/place | P2 | Franklin/Pickaway context, village and ZIP distinctions, parks, housing, services, employment access and responsible jurisdictions. |
| Reese | CDP/place | P2 | Place-name boundary, nearby parks and daily services, housing stock, schools, transit and correct municipal/county attribution. |
| Zimmer | CDP/place | P2 | Place-name validation, nearby parks/services, housing stock, schools, utilities and the correct hub relationships for sparse local data. |
| Lincoln Village | CDP/place | P1 | Prairie Township recreation and services, west-side retail, family programs, housing affordability/condition, transit and jurisdiction clarity. |
| Easton area | Corridor | P0 | Shopping, restaurants and entertainment, family activities, jobs, hotels, transit, apartment pipeline and exact Columbus/Gahanna address context. |
| Polaris area | Corridor | P0 | Shopping, food and entertainment, family activities, jobs, hotels, apartments, traffic/transit and Columbus/Westerville/Delaware boundary context. |
| Amercrest | Neighborhood | P2 | Boundary and naming validation, nearest parks and schools, housing stock, daily services, transit and adjacent-neighborhood crosslinks. |
| Arena District | Neighborhood | P0 | Sports and event calendar, parks/riverfront, North Market access, restaurants, nightlife/all-ages split, apartments, parking/transit and development. |
| Brewery District | Neighborhood | P1 | Theater and entertainment, parks/river access, food and drink, historic context, apartments and homes, parking, development and German Village links. |
| Berwick | Neighborhood | P1 | Parks and recreation, family services, housing stock, schools, nearby food/retail, mobility and east/south-side boundary accuracy. |
| Clintonville | Neighborhood | P0 | Whetstone/Park of Roses and trail access, High Street food and shops, family/library activities, housing, rentals, zoning and corridor development. |
| Dennison Place | Neighborhood | P2 | Boundary, nearby parks and Short North/OSU amenities, rental versus owner stock, parking, development and adjacent-area distinctions. |
| Devon Triangle | Neighborhood | P2 | Boundary validation, nearest parks/services, housing stock, transit, schools and connections to surrounding east-side hubs. |
| Downtown | Neighborhood | P0 | Scioto Mile and Columbus Commons, COSI and museums, libraries, food halls, sports/arts events, apartments, parking/transit and office conversions. |
| Driving Park | Neighborhood | P1 | Driving Park and recreation, family services, Livingston corridor food/retail, housing condition and costs, transit, development and civic groups. |
| Discovery District | Neighborhood | P1 | Museums and cultural institutions, Topiary Park/library access, education/health anchors, apartments, food, parking/transit and redevelopment. |
| Eastmoor | Neighborhood | P1 | Parks and schools, Main/Broad corridor services, housing stock, food and recreation, transit and Bexley/Whitehall boundary distinctions. |
| Fifth by Northwest (5xNW) | Neighborhood | P1 | Grandview/Fifth/Northwest corridors, parks, food and nightlife, rentals and infill, parking/walkability and adjacent-city boundary accuracy. |
| Franklinton | Neighborhood | P0 | Arts district and festivals, Scioto access, COSI proximity, food/openings, housing and displacement context, flood history, development and transit. |
| German Village | Neighborhood | P0 | Schiller Park, Book Loft area, restaurants/coffee, family/daytime activities, historic review, housing/rent, parking and annual events. |
| Glen Echo | Neighborhood | P2 | Ravine/park context, Indianola and High Street access, housing stock, rentals, drainage/environment, transit and Clintonville/University links. |
| Harrison West | Neighborhood | P1 | Olentangy Trail and river access, neighborhood parks, food/retail, apartments and homes, medical/OSU proximity, development and parking. |
| Hilltop | Neighborhood | P0 | Big Run and recreation access, libraries/family services, West Broad food/retail, housing affordability/condition, transit, development and civic meetings. |
| Indiana Forest | Neighborhood | P2 | Boundary and naming validation, campus proximity, rental stock, parks, food, parking/transit and University District crosslinks. |
| Indianola Terrace | Neighborhood | P2 | Boundary, campus and Old North access, rentals, parks, food, transit, parking and redevelopment pressures. |
| Italian Village | Neighborhood | P0 | Italian Village Park, Short North/4th Street food and entertainment, new apartments, housing, parking, development and community review. |
| King-Lincoln Bronzeville | Neighborhood | P0 | Lincoln Theatre and Black cultural history, festivals/arts, parks, food, housing and development, transit and preservation. |
| Knollwood Village | Neighborhood | P2 | Boundary, nearby parks and schools, housing stock, daily services, transit and adjacent-neighborhood relationships. |
| Livingston | Neighborhood | P1 | Livingston Avenue businesses and services, parks/family programs, housing, transit, healthcare access, development and area-boundary definition. |
| Maize-Morse | Neighborhood | P1 | Parks/recreation, libraries and family services, Morse retail/food, rentals and homes, transit, schools and Northland/Clintonville distinctions. |
| Merion Village | Neighborhood | P1 | Moeller and nearby parks, South High food/retail, family activities, housing/rent, infill, transit and German Village/South Side boundaries. |
| Milo-Grogan | Neighborhood | P1 | Recreation and community assets, nearby food/retail, housing, I-71 impacts, development, transit and Italian Village/Weinland Park links. |
| Mount Vernon | Neighborhood | P1 | King Arts Complex and Bronzeville connections, parks, food and community events, housing, transit, development and disambiguation from Knox County. |
| Necko | Neighborhood | P2 | Exact boundary, university/medical proximity, rentals and homes, parks/trail access, parking, transit and adjacent-area links. |
| North Campus | Neighborhood | P1 | Campus events and cultural assets, parks, High Street food, rental market, parking/transit, student/non-student housing and boundary clarity. |
| North Linden | Neighborhood | P0 | Linden recreation/library/family services, parks, Cleveland Avenue businesses, housing, transit, redevelopment, civic meetings and school context. |
| Northland | Neighborhood | P0 | Kilbourne Run and recreation, libraries/family programs, international food and retail, housing/rents, transit, redevelopment and broad boundary definition. |
| Old North Columbus | Neighborhood | P1 | High Street music/food, parks and trail access, rentals and homes, campus proximity, parking/transit and Clintonville/University distinctions. |
| Olde Towne East | Neighborhood | P0 | Franklin Park access, Parsons/Main food and shops, community events, historic housing, rentals, development, transit and Near East Side links. |
| San Margherita | Neighborhood | P2 | Boundary and identity, nearby parks, schools and services, housing stock, industrial/rail context, transit and west-side crosslinks. |
| Short North | Neighborhood | P0 | Gallery Hop and arts, Goodale Park, dining and nightlife/all-ages split, shopping, hotels, apartments, parking/transit and development. |
| South Campus area | Neighborhood | P1 | Campus events, food and entertainment, rentals, parks, parking/transit, renter protections and University/Short North boundary clarity. |
| South Linden | Neighborhood | P0 | Linden recreation and family services, parks, Cleveland Avenue businesses, housing and affordability, transit, redevelopment and civic meetings. |
| South Side | Neighborhood | P0 | Scioto Audubon and recreation access, libraries/family services, Parsons/South High food, housing, development, transit and health resources. |
| Tri-Village | Neighborhood | P1 | Grandview/Marble Cliff/Upper Arlington relationships, parks, family services, food/retail, housing and exact municipal/school boundaries. |
| University District | Neighborhood | P0 | Campus and neighborhood events, arts, parks, High Street businesses, rentals, housing quality, transit, parking and district subarea crosswalk. |
| Victorian Village | Neighborhood | P0 | Goodale Park, Short North access, historic housing, food and events, rentals, parking, development and Harrison West/Italian Village boundaries. |
| Walnut Hills | Neighborhood | P2 | Boundary validation, parks and schools, housing stock, daily services, transit and distinctions from similarly named places. |
| Weinland Park | Neighborhood | P1 | Weinland Park and recreation, 4th/High Street access, food and services, rentals/homes, development, transit and University/Italian Village links. |
| Westgate / West Scioto | Neighborhood | P1 | Westgate Park and community events, Scioto/trail access, West Broad services, housing, schools, transit and combined-hub boundary clarity. |
| The Ohio State University area | Neighborhood | P0 | Campus events, museums and sports, parks, food and entertainment, rentals and housing, transit, parking and exact campus-area subhubs. |

## Delivery sequence

### Sprint A — implemented baseline and discovery follow-ons

- All 86 hubs receive complete photo and action-card states.
- Launch things-to-do, housing-search, directory, and list-your-business pages.
- Add rental-listing and directory-review lead types without auto-publication.
- Put all new permanent routes in the sitemap and primary/footer navigation.
- Add intent-aware search/resource results, saved items, and area-scoped housing links.

### Sprint B — reference hubs

**Open.** Complete Columbus Citywide, Dublin, German Village, Clintonville, Downtown, Short North, Easton, and Polaris first. These exercise the region, city, neighborhood, and corridor models. Each must pass the usefulness gate before replication.

### Sprint C — cities and high-use neighborhoods

Complete every P0/P1 city and neighborhood, including documentary photos, verified local anchors, recurring events, food/opening status, parks/programs, development trackers, and source-aware housing/rent data.

### Sprint D — CDPs, villages, and boundary-sensitive places

Prioritize geography correctness over page volume. A sparse place should explain its boundaries and responsible jurisdictions honestly, crosslink nearby verified amenities, and avoid inventing a downtown, neighborhood identity, or attraction list that does not exist.

## Source and refresh policy

- Live searches are discovery aids, not CREN endorsements or permanent listings.
- Curated places require an official/business URL, address, category, area relationship, last-verified date, accessibility/hours note when available, and status (`active`, `seasonal`, `temporarily closed`, `closed`, or `unverified`).
- Events require organizer, canonical URL, venue, start/end time, recurrence, price/registration, age guidance, accessibility, weather/cancellation policy, and last-verified date.
- Directory businesses require identity, service area, contact, claims/credentials evidence, sponsor disclosure, last-reviewed date, and a correction/removal path.
- Housing links require quarterly link checks. Listing counts and prices are not copied into evergreen copy unless stored as sourced, dated observations with permitted use.
- Priority hubs: monthly audit. Other hubs: quarterly audit, plus immediate correction when a verified status change is received.

## Initial authoritative discovery sources

- Columbus Recreation and Parks: <https://www.columbus.gov/Community/Recreation-and-Parks/Parks-Trails>
- Columbus & Franklin County Metro Parks: <https://www.metroparks.net/>
- Columbus Metropolitan Library events: <https://events.columbuslibrary.org/events>
- Experience Columbus events: <https://www.experiencecolumbus.com/events/?sort=date&view=list>
- Franklin County Auditor tools: <https://auditor.franklincountyohio.gov/Auditor/Online-Tools>
- Ohio school report cards: <https://reportcard.education.ohio.gov/>
- Columbus legislation: <https://columbus.legistar.com/Legislation.aspx>
- Columbus Chamber directory: <https://web.columbus.org/directory/search/searchadvanced.aspx>
- Better Business Bureau Columbus home-maintenance category: <https://www.bbb.org/us/oh/columbus/category/home-maintenance>
