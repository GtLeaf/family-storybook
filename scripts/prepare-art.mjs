import sharp from "sharp";
const backgrounds = {
  cover: "storybook-cover-local-v1",
  wind: "wind-picnic-v1",
  search: "woodland-search-v1",
  path: "path-to-big-tree-v1",
  discovery: "tree-discovery-v1",
  picnic: "sheltered-picnic-v2",
};
for (const [name, source] of Object.entries(backgrounds)) {
  await sharp(`docs/assets/scene-exploration/${source}.png`)
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(`public/art/${name}.webp`);
}
const characters = {
  bear: "exec-e41c29cd-d0cd-436e-ad28-bca3c703d339",
  pig: "exec-f6ff41c1-7756-4988-9c28-43a549e79fd7",
  donkey: "exec-ccba4044-92d1-4ddb-a56f-abdc48ed88cc",
};
for (const [name, source] of Object.entries(characters)) {
  await sharp(`asset/role/${source}.png`)
    .trim({ threshold: 35 })
    .resize({ height: 720, withoutEnlargement: true })
    .webp({ quality: 85, alphaQuality: 100 })
    .toFile(`public/art/${name}.webp`);
}
