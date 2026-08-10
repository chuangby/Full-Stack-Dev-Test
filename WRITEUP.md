# Write-up

## What I built

A small full-stack web app that lets a technician standing on a job site generate a
customer-ready estimate in under a minute: pick the customer, the job type, the scope/level
of work, and any equipment needed, and it produces a priced "work order" style estimate with
a total range, ready to show the customer or print/save as a PDF on the spot.

- **Backend**: Node + Express, serving the three data files through a small API
  (`/api/customers`, `/api/equipment`, `/api/labor-rates`, `POST /api/estimate`).
- **Frontend**: Vanilla HTML/CSS/JS — no build step, so it's easy to run and easy to review.
- **Pricing logic**: isolated in `lib/pricing.js`, separate from routing, so it's easy to
  read and unit test independently of the server.

## Why I made these choices

**I treated the messy data as the real problem, not a footnote.** The equipment and customer
JSON both have inconsistent field names (`baseCost` vs `base_cost`, `propertyType` vs
`property_type`, `squareFootage` vs `sqft`), and some customer records are missing fields
like `phone` or `lastServiceDate`. Rather than hand-editing the JSON to "fix" it, I added a
`lib/normalize.js` layer that every record passes through on load, so the rest of the app can
assume one consistent shape. This is the same pattern I'd reach for with real data that comes
from an upstream system I don't control — fix it at the boundary, once, instead of littering
defensive checks throughout the UI.

**I gave a price range, not a single number.** The labor rate data is already expressed as a
range (`estimatedHours.min`/`max`), and a repair genuinely can take anywhere from 30 minutes
to 2 hours depending on what the tech finds. Collapsing that to one number would be more
confident than the underlying data supports, and would set the wrong expectation with the
customer standing there. I show a low–high total instead.

**I added a flat service call fee.** This wasn't in the source data, but it's a standard
practice in HVAC field service (a base charge just for the visit), and leaving it out would
under-quote every job. I called it out explicitly as an assumption rather than quietly baking
it into the numbers.

**No build tooling on the frontend.** Given this is meant to be reviewed and run quickly, I
skipped React/Vite/etc. in favor of plain JS. It keeps `npm install && npm start` as the
entire setup, and keeps the diff readable for someone reviewing the code.

**Print-friendly output.** Since the whole point is showing something to a customer on-site,
the estimate ticket has a print stylesheet so a tech can hand over a clean PDF/printout, not
just a laptop screen.

## What I'd do differently with more time

- **Persistence**: right now nothing is saved — closing the tab loses the estimate. I'd add a
  lightweight store (SQLite or similar) so estimates could be recalled, revised, and turned
  into actual invoices later.
- **Offline support**: techs are often in basements or on rooftops with poor signal. A
  service worker + cached data would let the tool work with no connection and sync later.
- **Data validation on write, not just read**: I normalize on the way in, but I'd also want a
  small ingestion script that flags malformed records back to whoever exports this data, so
  the root cause gets fixed upstream over time instead of being normalized forever.
- **Equipment bundles/kits**: right now equipment is picked item-by-item; real installs often
  use a known bundle (e.g. "3-ton residential AC install" = unit + coil + thermostat), which
  could be modeled as presets to speed up the common case further.
- **Tests**: given more time I'd add unit tests around `lib/pricing.js` and `lib/normalize.js`
  specifically, since those are the parts most likely to silently produce a wrong price.
