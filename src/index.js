const app = require("./server");
const { PORT, HOST } = require('./config/config');

app.listen(PORT, HOST, () => {
    console.log(`GamePlan API is now running`);
});