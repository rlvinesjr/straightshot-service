# Residential Garage Door Estimator

This branch adds a shared residential garage-door estimating system for the StraightShot website and field app.

## Routes

- `/door-estimator` — public baseline estimator for the website
- `/door-estimator/field` — on-site field estimator
- `/door-estimator/admin` — private vendor pricing and multiplier editor

## Environment variables

```env
DOOR_ESTIMATOR_ADMIN_KEY=choose-a-long-random-secret
DOOR_ESTIMATOR_ALLOWED_ORIGIN=https://straightshotoverhead.com
```

In local development, the fallback key is `straightshot-dev` when `DOOR_ESTIMATOR_ADMIN_KEY` is not set.

## Database

Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Pricing

The default retail calculation is:

```text
Configured vendor subtotal × 3
Round to the nearest $100
Subtract $1
```

A $900 vendor cost therefore produces a $2,699 installed customer price. Normal installation, removal, and disposal are included.

## Website integration

The public route can be linked directly from the existing website. If the marketing website is hosted separately, proxy or embed `/door-estimator` and set `DOOR_ESTIMATOR_ALLOWED_ORIGIN` to the public site origin. The public APIs return retail prices only; vendor costs remain server-side.

## Validation

```bash
npm run validate:door-estimator
npm run build
```

## Scope

- Residential doors only
- Maximum 18 feet wide and 9 feet tall
- No manufacturer names or model numbers in customer-facing output
- Shared versioned vendor price book
- Website baseline estimates
- Field estimates with internal cost and gross-margin display
- Website lead and field-estimate persistence
