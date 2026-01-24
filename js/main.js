/* js/main.js */
import { Application } from './Application.js';

// Create and Start Application
const app = new Application();
app.init();

// Optional: Expose app to window for debugging in console
window.app = app;