module.exports = function(RED) {
    function mssqlpsserverconf(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.encryption = n.encryption;
        this.database = n.database;
        this.timeout = n.timeout;
        this.querytimeout = n.querytimeout;
        this.username = n.username;
        this.password = n.password;
    }

    RED.nodes.registerType("mssql-ps-serverconf", mssqlpsserverconf,{
        credentials: {
            username: {type:"text"},
            password: {type:"password"}
        }
    });
};