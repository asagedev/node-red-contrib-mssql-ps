module.exports = function(RED) {
	'use strict';
	const sql = require('mssql');
	const util = require('util');

	function mssqlps(n) {
		RED.nodes.createNode(this, n);
		this.server = RED.nodes.getNode(n.server);
        this.params = n.params;
        console.log(this.params);
        this.sql = n.sql;
        console.log(this.sql);
		var node = this;
		node.debug = false; //leave this off for production - will log username/password for some errors
		node.status({});//this.on('close' causes timeouts when re-deploying so clear the status at the beginning of the node instead of on close

		if (this.server != null) {
			const sqlconfig = {
				user: this.server.credentials.username,
				password: this.server.credentials.password,
				server: this.server.host, // You can use 'localhost\\instance' to connect to named instance 
				database: this.server.database,
				options: {
					encrypt: this.server.encryption // Use this if you're on Windows Azure 
				},
				pool: {
					max: 10,
					min: 0,
					idleTimeoutMillis: 30000
				}
			};
			node.pool = new sql.ConnectionPool(sqlconfig);
			node.pool.connect(err => {
				if (err){
					node.error("Error connecting to server " + err);
					if (node.debug){
							node.log("SQL config:");
							console.log(sqlconfig);
							node.log("Error:");
							console.log(err);
						}
					node.status({fill:"red",shape:"dot",text:"Error connecting to server"});
				}
			});
			node.pool.on('error',function(err){
				node.error("Connection pool error" + err);
				if (node.debug){
					node.log("Error:");
					console.log(err);
				}
				node.status({fill:"red",shape:"dot",text:"Connection pool error"});
			});
		}
		else{
			node.error("Server config not set up");
			node.status({fill:"red",shape:"dot",text:"Server config not set up"});
		}
		
		//don't think this is neccessary
		sql.on('error',function(err){
			node.error("Error on sql object " + err);
			if (node.debug){
				node.log("SQL config:");
				console.log(sqlconfig);
				node.log("Prepared Statement:");
				console.log(this.sql);
				node.log("Error:");
				console.log(err);
			}
			node.status({fill:"red",shape:"dot",text:"Error on sql object"});
		});

		this.on('input',function(msg){
            if (node.debug){
                node.log("-------------------------Begin SQL-------------------------");
                node.log("Prepared Statement:");
                console.log(this.sql);
                node.log("Passed parameters:");
                console.log(msg.params);
            }
			if (typeof this.sql === "string" && typeof msg.params !== "undefined" && typeof msg.params === "object"){
				var paramcount = this.params.length;
				const ps = new sql.PreparedStatement(node.pool);
				
				for (var i = 0; i < paramcount; i++) {
					var paramtype = this.params[i].paramtype;
					var paramname = this.params[i].paramname;
					var paramoptsone = this.params[i].paramoptsone;
					var paramoptstwo = this.params[i].paramoptstwo;
					var maxdatatype = false;
					//Check if the datatype is MAX - if adding new datatypes, returned string from the config node must have MAX on the end
					if (paramtype == "VarCharMAX" || paramtype == "NVarCharMAX" || paramtype == "VarBinaryMAX"){
						maxdatatype = true;
						if (node.debug){
							node.log("MAX datatype selected");
                            node.log("paramtype: " + paramtype);
						}
					}
					if (Object.hasOwnProperty.call(sql, paramtype) || maxdatatype) {
						if (paramoptsone != "" && paramoptstwo != "" ){
							ps.input(paramname, sql[paramtype](paramoptsone,paramoptstwo));
							if (node.debug){
                                node.log("paramname: " + paramname);
                                node.log("paramtype: " + paramtype);
                                node.log("Two param options");
                                node.log("paramoptsone: " + paramoptsone);
                                node.log("paramoptstwo: " + paramoptstwo);
							}
						}
						else if (paramoptsone != "" && paramoptstwo == ""){
							ps.input(paramname, sql[paramtype](paramoptsone));
							if (node.debug){
                                node.log("paramname: " + paramname);
                                node.log("paramtype: " + paramtype);
                                node.log("One param option");
                                node.log("paramoptsone: " + paramoptsone);
							}
						}
						else if (paramoptsone == ""){
							if (maxdatatype){
								//Strip off the MAX part to get the correct datatype
								ps.input(paramname, sql[paramtype.slice(0, -3)](sql.MAX));
							}
							else{
								ps.input(paramname, sql[paramtype]);
							}
							if (node.debug){
                                node.log("paramname: " + paramname);
                                node.log("paramtype: " + paramtype);
                                node.log("No param options");
							}
						}
					}
					else {
						node.error("Invalid parameter type", msg);
					}
				}

				ps.prepare(this.sql, err => {
					if (err){
						node.error("Error Preparing Statement " + err, msg);
						if (node.debug){
							node.log("Error:");
							console.log(err);
						}
						node.status({fill:"red",shape:"dot",text:"Error preparing statement"});
					}
					else{
						var rows = [];
						ps.stream = true;
						
						const request = ps.execute(msg.params, (err, result) => {
							if (!err){
								if (node.debug){
									node.log("Recordset");
									console.log(rows);
								}
								msg.payload = rows;
								node.send(msg);
								node.status({});
							}
							else{
								node.error("Error executing statement " + err, msg);
								if (node.debug){
									node.log("Error:");
									console.log(err);
								}
								node.status({fill:"red",shape:"dot",text:"Error executing statement"});
							}
							ps.unprepare(err => {
								if(err){
									node.error("Error unpreparing statement " + err, msg);
									if (node.debug){
										node.log("Error:");
										console.log(err);
									}
									node.status({fill:"red",shape:"dot",text:"Error unpreparing statement"});
								}
							});
							
						});

						request.on('recordset', columns => {
							// Emitted once for each recordset in a query 
							//probably delete this listener 
						});

						request.on('row', row => {
							rows.push(row);
						});

						request.on('error', err => {
							node.error("Request error listener " + err, msg);
							if (node.debug){
								node.log("Error:");
								console.log(err);
							}
							node.status({fill:"red",shape:"dot",text:"Error on request listener"});
						});

						request.on('done', result => {
							if (node.debug){
								node.log("Result:");
								console.log(result);
							}
						});
					}
				});
			}
			else{
				if (typeof this.sql !== "string"){
					node.error("Prepared statement config not set up", msg);
					node.status({fill:"red",shape:"dot",text:"Prepared statement config not set up"});
				}
				if (typeof msg.params === "undefined"){
					node.error("msg.params not passed", msg);
					node.status({fill:"red",shape:"dot",text:"msg.params not passed"});
				}
				else if (typeof msg.params !== "object"){
					node.error("msg.params not an object", msg);
					node.status({fill:"red",shape:"dot",text:"msg.params not an object"});
				}
			}
            if (node.debug){
                node.log("--------------------------End SQL--------------------------");
            }
		});
	}
	RED.nodes.registerType('node-red-contrib-mssql-ps', mssqlps);
};
