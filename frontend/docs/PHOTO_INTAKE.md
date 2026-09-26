# CREN photo intake: owned photos and reader photos

Owner approved September 26, 2026 as part of the image policy amendment (`docs/IMAGE_POLICY.md`, section B).
Goal: a CREN-owned library of documentary photos of sites in the news, so a verified story is never held for lack of a
photo of the actual place.

## 1. The weekly photo run (owner, about 30 minutes)

**When:** once a week, daylight, ideally Saturday or Sunday morning when streets are quiet.

**What to shoot:** the "Photo requests" list in the newest newsroom brief (`briefs/YYYY-MM-DD.md`), plus anything on the
standing list below. Time sensitive sites (approved demolitions) go first.

**How to shoot each site (5 frames, about 3 minutes):**

1. Wide, landscape, from across the street: the whole building or lot with the street in front. This is the hero.
2. Same view from a corner angle, so two sides show.
3. Street sign or address number in the same frame as the site, if legible.
4. Context: the view down the block in each direction.
5. One detail that tells the story (the fence and gravel of a vacant lot, the facade of a building slated for demolition).

**Rules that keep the photo usable:**

- Landscape orientation, phone held level, no zoom beyond 2x, no filters, no portrait mode, no HDR "vivid" effects.
- Leave space around the subject; the site crops photos to 16:9, including on phones.
- Shoot from public sidewalks only. Do not enter fenced, posted or private property.
- Avoid identifiable faces and license plates as the subject. Passersby in the background are fine.
- Do not edit the file after taking it. Crop and resize happen downstream; the original bytes are the record.
- Phone location tagging may stay on; the GPS in the file shows the photo was taken at the site. Do not take library
  photos at home with location on.

**Standing list (current as of September 26, 2026):**

| Priority | Site | Why | Frames needed |
|---|---|---|---|
| 1, time sensitive | Former WWCD building, 1036 S. Front St., Brewery District | HRC approved demolition for a 106 unit Arcadia Development building; the building will be gone soon | All 5 |
| 2 | One Twenty Vine site, 120 Vine St., Arena District | Downtown Commission approved COA2600944 on September 22, 2026; currently a gravel lot | 1, 2, 4, 5 |
| 3 | SR 161 / Northland corridor, Morse Rd. and Cleveland Ave. area | Zone In corridor rezoning in front of City Council | 1 and 4 at two intersections |
| 4 | Former Downtown YMCA, 40 W. Long St. | Lofts at 40 Long conversion under construction; progress photos build a timeline | 1 and 2, repeat monthly |

The newsroom routine adds new sites to "Photo requests" in each daily brief; the owner does not need to track them.

## 2. Getting photos to the newsroom

1. In Google Drive, open the folder **CREN Photo Library / inbox** (create it once if it does not exist).
2. Upload the original files straight from the phone (Google Photos "download original", or AirDrop to a computer then
   upload). Do not send through text message or social apps; they recompress and strip the date.
3. Name each file `YYYY-MM-DD street-address frame-number`, for example `2026-09-27 1036 S Front St 1.jpg`. If renaming
   is a hassle, upload as is and add a note file (step 4) with the address.
4. Add one text file per run named `YYYY-MM-DD run notes.txt` containing:

```
Photographer: Stephen Adams for CREN
Date taken: 2026-09-27
Sites: 1036 S. Front St. (files 1 to 5); 120 Vine St. (files 6 to 9)
Rights: CREN owned. Released for publication and public redistribution under CC BY 4.0, credit "Stephen Adams / CREN".
```

The rights line matters: the repository is public, so every committed original must be licensed for public
redistribution, not only for display on the site. CC BY 4.0 does that while keeping credit.

## 3. What the newsroom routine does with an owned photo

1. Reads the inbox through the Google Drive connector, matches files to verified leads, and inspects each full image
   and its centered 16:9 crop.
2. Copies the chosen original, byte for byte, to `frontend/content/images/YYYY-MM-DD-descriptive-slug.jpg` and records
   the `cloud_image_asset` hashes.
3. Writes provenance:
   - `type: "LICENSED_PHOTO"`, `image_role: "SUBJECT"`
   - `source`: the Drive file link (also the SELECTED `source_review` url)
   - `license`: "CC BY 4.0, CREN owned"
   - `permission_evidence`: "CREN owned photo; run notes YYYY-MM-DD in CREN Photo Library"
   - `credit`: "Stephen Adams / CREN"
   - `location_note`: the address and which way the camera faces; `date_note`: the date taken from the run notes or EXIF
   - Caption pattern: "The former WWCD building at 1036 S. Front St., Sept. 27, 2026. Photo: Stephen Adams / CREN."
4. Moves nothing and deletes nothing in Drive; it lists used files in the brief under "Photo library used".

## 4. Reader-submitted photos

Readers can send photos through the contact form or by email to the CREN inbox. A reader photo is usable only after the
reader sends written permission in these words (copy and paste the reply below). Keep the reader's email out of GitHub;
record only "Written permission on file, received YYYY-MM-DD" in `permission_evidence`.

**Reply to send a reader who offers a photo:**

> Thank you for sending this. We would love to use your photo with our story. Before we can, we need your written
> permission. If you agree, please reply to this email with the following:
>
> "I took this photo and own it. I give Columbus Real Estate News permission to publish it and to share the original
> file publicly under the Creative Commons Attribution 4.0 license (CC BY 4.0). Please credit it as: [your name as you
> would like it to appear]. The photo was taken on [date] at [location]."
>
> CC BY 4.0 means others may also reuse the photo as long as they credit you. If you would rather not allow that, just
> let us know and we will not use the photo. Either way, thank you for helping us cover Columbus.

**Checks before use:** the photo matches the location and date the reader gave (compare against the site, street view
of the same year is not a source but can confirm the place), shows no private interiors without the owner's consent,
and has no faces as the subject. Reader photos use `type: "LICENSED_PHOTO"`, `license: "CC BY 4.0, reader submitted"`,
credit exactly as the reader asked.

## 5. What this does not authorize

No paying photographers, buying stock, or messaging developers and agencies for permission from the routine. Those stay
owner decisions. The routine never emails readers; the owner sends the permission reply.
