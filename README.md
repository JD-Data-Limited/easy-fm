# easy-fm

easy-fm is a Node.js module that allows you to interact with
a [FileMaker database stored](https://www.claris.com/filemaker/) on
a [FileMaker server](https://www.claris.com/filemaker/server/). This module interacts with your server using the
[FileMaker Data API](https://help.claris.com/en/data-api-guide/content/index.html).

## FileMaker setup instructions

1. Enable the FileMaker Data API from the server's admin console. This setting is located
   in `Connectors > FileMaker Data API`.
2. Create a FileMaker database account for easy-fm to use. This account must have the 'Access via FileMaker Data API (
   fmrest)' extended privilege


## Usage examples

1. Get the first record on the 'table1' layout
```javascript
import fm, {FMError} from "easy-fm"; // Import the module
const connection = new fm(); // This variable will be used for interacting with the server

connection.login(hostname, database, username, password).then(async token => { // Login
    let layout = connection.getLayout("layout1")
    let record = layout.getRecord(1)
    await record.get() // Fetch the data for that record
    console.log(record)
})
```

2. Get all related portal records
```javascript
await record.get() // Fetch the record's data
let portal = record.getPortal("portal1") // 'portal1' should be the name you assigned the portal object, when creating the layout
console.log(portal.records)
```

3. Run a script
```javascript
    let script = connection.script("script_name", "this is a parameter") // Create a new script object using the script name and parameter (optional)
    
    // Get the layout we want to run the script on
    let layout = connection.getLayout("layout1")

    // Run the script on the layout
    let result = await layout.runScript(script)
    console.log(result)
```

4. Perform a find
```javascript
let find = layout.newFind() // Create a new find operation

find.addRequests( // Specify the find criteria
    {"PrimaryKey": "AAAAA", "ModifiedBy": "BBBB"}, 
    {"CreatedBy": "BBBB"}
)

find.addSort("CratedBy", "ascend") // Sort the results in ascending order
let records = await find.find() // Perform the find
console.log(records)
```
This is the same as the following find request in FileMaker:
![img.png](img.png)