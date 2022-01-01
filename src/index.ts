// import express from "express";
// import init_service from "./service/init";
// const app = express();
// const port = 3000;
// app.get("/start", (_, res) => {
//   init_service();
//   res.status(200).send();
// });
// app.listen(port, () => console.log(`Running on port ${port}`));

import init_service from "./service/init";

const main = async () => {
  init_service();
};

main();
