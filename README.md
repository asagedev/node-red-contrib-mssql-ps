This node was created to execute prepared statements from Node-RED using the node.js node mssql. Pass in the parameters for the prepared statement as an object in `msg.params` Ex:
```
msg.params = {
    id:1,
    name:"John Doe"
}
```
Parameter object names must match parameters set up in the Prepared Statement and can be any string. Depending on the parameter type selected there may be options required. In the SQL Statement reference parameters by using @(parameter name) Ex:
```
SELECT *
FROM users
WHERE userid = @id OR name = @name;
```