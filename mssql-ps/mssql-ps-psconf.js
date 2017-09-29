module.exports = function(RED) {
    function mssqlpspsconf(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
		this.params = n.params;
		this.paramname = n.paramname;
		this.paramtype = n.paramtype;
		this.paramoptsone = n.paramoptsone;
		this.paramoptstwo = n.paramoptstwo;
		this.sql = n.sql;
    }

	RED.nodes.registerType("mssql-ps-psconf", mssqlpspsconf);
};