# exoticterras

Static shop for exoticterras.in (GitHub Pages, custom domain in `CNAME`). Orders go to WhatsApp.

## Layout
- `index.html`: the whole shop. Products, categories and cart are JavaScript in this file (`PRODUCTS`, `CATS`).
- `isopods/`, `springtails/`, `plants/`, `packs/`, `terrariums/`: one static page per product, for search engines. Each has its own title, description, canonical URL and structured data.
- `guides/`: care guides.
- `stock.csv`: price and stock sheet. Blank price = price on enquiry.
- `sitemap.xml`, `robots.txt`, `404.html`: search and error handling.

## Add a normal product
1. Add a line to `PRODUCTS` in `index.html` (copy a similar one). Photo goes in `images/<id>.jpg`.
2. Copy a page in the same category folder, rename the folder and edit the text and price.
3. Add the page to `sitemap.xml`, the product list JSON-LD and the footer links in `index.html`, and a row to `stock.csv`.

## Add a made-to-order terrarium (no fixed price)
- In `PRODUCTS`, set `cat:"terra"`, `enquiry:true` (shows "Price on enquiry" and an Enquire button) and `model:"<type>"` for the 3D viewer.
- 3D types in `build3D`: jar, bowl, tank, cube, wardian, tube, mini, kit (anything else draws the kit). A new shape needs a new branch there.
- Copy one of the `terrariums/*` pages for search, leave out `offers` in its JSON-LD, and add it to the sitemap, `stock.csv` and the home page terrarium list.
- Add `USE` (care tips) and `INCL` (what you get) entries for the same id in `index.html`.

## Notes
- The 3D viewer loads three.js from cdnjs only when a model page is opened.
- Prices in `stock.csv` can update the shop's prices when the sheet sync runs; rows with a blank price are skipped.
