const app = require("./server");
const { PORT, HOST } = require("./config/config");

// Start the server and listen on the specified HOST and PORT
app.listen(PORT, HOST, () => {
    console.log(`GamePlan API is now running on http://${HOST}:${PORT}`);
});