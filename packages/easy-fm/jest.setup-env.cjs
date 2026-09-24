const {config} = require('dotenv')

// Load test-specific values first when present, then fall back to the default .env file.
config({ path: '.env.test' })
config()
