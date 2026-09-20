# Pixel art, identity and playfield readability

Evidence: [Derek Yu](https://www.derekyu.com/makegames/pixelart.html) explains palette control, clean shapes and large value clusters. [Valve's TF2 paper](https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf), section 4, describes validating character designs through silhouette and limiting environmental visual noise.

Proposed application:

- From actual character reference images, select identifying proportions, silhouette and a few colour/shape features. A name attached to a generic sprite is insufficient.
- Choose enough pixels to preserve those features. Prefer fewer readable animation frames to many inconsistent ones; keep anchors stable.
- Make player, hazard and pickup distinguishable by shape and value as well as colour. Quiet the background around active threats.
- Tie effects to meaningful events; avoid hiding hitboxes behind decoration.

Checks: native-size recognition without a label; silhouette and grayscale review; moving-background contrast; consistent proportions across poses; actual CRT viewing. Recognition and CRT acceptance require visual review. The reference pages were read as research, not used to approve any generated assets.
