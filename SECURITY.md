# Security

## Reporting a problem

If you find a security problem in this tool or this code, please email **ho.marketanalysis@nrc.no** with:

- what you found
- the steps to see it
- the page or file where it happens

Please do not report security problems in a public issue, and do not test against the live site in a way that could harm it or its users.

We will confirm we received your report and keep you updated while we fix it.

## How the tool protects users

- No accounts and no saved maps. Maps stay in the user's browser until they download them.
- No secrets are stored in this repository. The CARTO basemap key is kept as a GitHub repository secret and added when the site is built. Like any browser map key, it is visible in the published site. If it is misused, it is replaced.
- The site is fully static, with no server and no database.
