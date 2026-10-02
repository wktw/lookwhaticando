# Fresh dependency audit and consent receipt

Automatic approval review initially rejected a registry audit before execution because it sends public dependency names and versions to `https://registry.npmjs.org/`. New CI-triggering backups and reruns were then held because the existing `npm ci` also audits by default. D3 CI had already completed its install when that broader effect was identified; the install was not prevented and its result was not treated as a standalone vulnerability audit.

The owner subsequently answered **“Approved”** to the disclosed metadata request. That consent resolved the hold and authorizes resuming the ordered exact backups and CI. The separate owner project-review phase remains on hold.

After that approval, root ran `npm audit --json` against clean G2 `e05ae2279c0b5253f096eb58db03d42d12ba0600`. The actual process exited **0** at **2026-10-02 14:11:33 UTC**. The [unaltered JSON receipt](dependency-audit.json) reports schema version 2, **zero vulnerabilities across 495 dependencies**, with no error. The registry was `https://registry.npmjs.org/`.

- Receipt SHA-256: `143fc61ca74c0c2c06e5a639721c3071aff11415422fc6d591cdbf463e51607b`.
- Audited lockfile SHA-256: `2ff3872ef91f4576fef0f055d0208ad66233d6755960f180a84d72fd547abef5`.

This is a completed fresh audit, separate from the earlier author audit, local app checks and still-queued exact-head GitHub runs. No future backup or Windows result is inferred from it.
