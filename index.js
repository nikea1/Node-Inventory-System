/*

Two methods of data entry

Method one:
	Connect to DigimonCard.io to GET card information based on Card number
		Internet required
		card rarity information is not garenteed so a prompt for rarity may be required for now
		Use with file for batch entry
Method two:
	If internet is down, manual entry is needed
		better be accurate
	Read file for batch

Queries
	Card:
		Insert new card 
			//With internet
		A table -c		(cardNumber) => Put{cardNumber, cardName, cardColor, cardType, cardRarity, CardSetNumber}
			//without internet
		A table -...	(cardNumber, cardName, cardColor, cardType, cardRarity) => Put{cardNumber, cardName, cardColor, cardType, cardRarity, cardSetNumber}

		Read Card info 
		S table		(Query inputs) => Get{CardNumber, CardName, cardColor, cardType cardRarity}
					(*)=> GET ALL {CardNumber, CardName, cardColor, cardType cardRarity}
		Update card information
		E table -c attr1 attr2	(cardNumber, {attr1: [old, new],...}) => {}
		Delete card
		R table id	(cardNumber)=> {}

	Location:
		Insert new location
		A table -l	(locationName) => Put{LocationName}
		Read Location info
		S table -l	(locationName) => GET{LocationId, Location Name}
		S table		(*)=GET ALL {LocationId, Location Name}
		Update location
		E table -l old new	(locationName, newLocationName) => {}
		Delete location
		R table -l	(locationID) => {}

	Inventory:
		Insert new entry
		A table -c -l -q	(cardNumber, LocationName, quantity) => PUT{cardNamber, LocationID, quantity}
		Read Inventory info
		S table-...	(query) = > GET {quantity, cardNumber, CardName, Color, Location}
		C -... 	(query) => GET {SUM(quantity)}
		Update quantity
		E table -c -l -i	(cardnumber, location, increment) => INCR{quantity}
		E table -c -l -s	(cardnumber, location, new value) => SET{Quantity}
		Update card location
		M -c -l -q	(cardnumber, location, newlocation, quantitymoved) => UPDATE{}
		Remove card from location
		R table -c -l	(cardNumber, LocationID)=> {}

*/
var connection = require("./config/config.js");
var axios = require("axios");
const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');

RARITY = {
	"Uncommon": "U",
	"Common": "C",
	"Rare": "R",
	"Super Rare": "SR",
	"Secret": "SEC",
}
// Commander + Axios + MySQL2

function closeDB(){
	connection.end((err)=>{
		if(err){
			console.error("error connecting: "+err.stack);
			return;
		}
		console.log("DB closing");
	})
}


// function SelectAll(table){
// 	connection.query("SELECT ??.* FROM ??",table, (err, rows, fields)=>{
// 		if(err) console.log(err)

// 		console.log(rows);
// 		closeDB();

// 	})
// }

// Card.number, Card.name, color, type, rarity
// function Select(values,tables,conditions, joins=""){
// 	q = values.concat(tables, conditions.qarr)
// 	sqlobj={
// 		sql: "SELECT ?? FROM ??" + joins + conditions.fstr,
// 		values: q
// 	}
// 	console.log(sqlobj);
// }

function SelectCard(options){
	sqlobj = {
		sql: "SELECT Card.* FROM Card JOIN CardSet ON CardSet.id = cardSetId"+options.fstr,
		values: options.qarr,
		// nestTables: true,

	}
	// console.log(sqlobj);

	connection.query(sqlobj,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
		closeDB();
	})
}

function SelectCardSet(options){
	sqlobj = {
		sql: "SELECT number, name FROM CardSet"+ options.fstr,
		values: options.qarr
	}
	console.log(sqlobj);

	connection.query(sqlobj,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
		closeDB();
	})
}

function SelectLocation(options){
	sqlobj = {
		sql: "SELECT * FROM Location" + options.fstr,
		values:options.qarr,
	}
		console.log(sqlobj);

	connection.query(sqlobj,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
		closeDB();
	})
}

function SelectCardFromLocation(options){
	sqlobj = {
		sql: "SELECT CardLocation.quantity, Card.number, Card.name, color, type, rarity, locationName FROM CardLocation "+
		"JOIN Location ON locationId = Location.id "+
		"JOIN Card ON Card.number = cardNumber "+
		"JOIN CardSet ON CardSet.Id = cardSetId" + options.fstr,
		values:options.qarr
	}

	console.log(sqlobj);
	connection.query(sqlobj,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
		closeDB();
	})

}

function CountCards(options){
	sqlobj = {
		sql: "SELECT SUM(quantity) FROM CardLocation "+
		"JOIN Location ON locationId = Location.id "+
		"JOIN Card ON Card.number = cardNumber "+
		"JOIN CardSet ON CardSet.Id = cardSetId" + options.fstr,
		values:options.qarr
	}
	console.log(sqlobj)
	connection.query(sqlobj,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
		closeDB();
	})
}

function InsertCard(values){
	sqlobj = {
		sql: "INSERT INTO Card SET ?"+
		" , cardSetId = (SELECT CardSet.id FROM CardSet WHERE CardSet.number =  ?)",
		values: values
	}
	console.log(sqlobj)
	connection.query(sqlobj,(err,res,fields)=>{
		if(err) console.log(err)

		console.log(res);
		closeDB();
	})
}

function InsertCardSet(values){
	sqlobj = {
		sql: "INSERT INTO CardSet SET ?",
		values: values
	}
	console.log(sqlobj)
	connection.query(sqlobj,(err,res,fields)=>{
		if(err) console.log(err)

		console.log(res);
		closeDB();
	})
}

function InsertLocation(values){
	sqlobj = {
		sql: "INSERT INTO Location SET ?",
		values:values
	}
	console.log(sqlobj)
	connection.query(sqlobj,(err,res,fields)=>{
		if(err) console.log(err)

		console.log(res);
		closeDB();
	})
}

function helperOpts(queryString, query){
	q=""
	query.forEach((a)=>{
		if(q == ""){
			q=queryString;
		}
		else{
		q += " OR " + queryString; 
		}
	})

	return "("+q+")";
}

function buildQuery(qobj,queryString, query){
	if(qobj.fstr != "")
		qobj.fstr += " AND "
	qobj.fstr +=helperOpts(queryString, query)
	qobj.qarr = qobj.qarr.concat(query)

	return qobj;
}


function OptionSwitch(mode, options){
	qobj = {fstr: "", qarr:[]};
	for (let o in options){
				
		switch(o){
			case "boosterCode":
				if(mode == "Card" || mode == "CardSet" || mode == "CardLocation")
					qobj = buildQuery(qobj, "CardSet.number = ?", options[o])
				break;
			case "boosterName":
				if(mode == "Card" || mode == "CardSet" || mode == "CardLocation")
					qobj = buildQuery(qobj, "CardSet.name LIKE CONCAT('%',?,'%')", options[o])
				break;
			case "cardNumber":
				if(mode == "Card" || mode == "CardLocation")
					qobj = buildQuery(qobj, "Card.number = ?", options[o])
				break;
			case "cardName":
				if(mode == "Card" || mode == "CardLocation")
					qobj = buildQuery(qobj, "Card.name = ?", options[o])
				break;
			case "type":
				if(mode == "Card" || mode == "CardLocation")
					qobj = buildQuery(qobj, "type = ?", options[o])
				break;
			case "color":
				if(mode == "Card" || mode == "CardLocation")
					qobj = buildQuery(qobj, "color = ?", options[o])
				break;
			case "rarity":
				if(mode == "Card" || mode == "CardLocation")
					qobj = buildQuery(qobj, "rarity = ?", options[o])
				break;
			case "location":
				if(mode == "Location" || mode == "CardLocation")
					qobj = buildQuery(qobj, "locationName = ?", options[o])
				break;

		}//end of switch
	}
	return qobj;
}

function RunSearchQuery(mode, options){
	qobj = OptionSwitch(mode, options);
	if(qobj.fstr != "" && qobj.qarr != [])
		qobj.fstr = " WHERE " + qobj.fstr;
	if(mode == "Card")
		SelectCard(qobj)
	else if(mode == "Location")
		SelectLocation(qobj)
	else if(mode == "CardLocation")
		SelectCardFromLocation(qobj)
	else if(mode == "CardSet")
		SelectCardSet(qobj)

}

function RunCountQuery(options){
	qobj = OptionSwitch("CardLocation", options);
	if(qobj.fstr != "" && qobj.qarr != [])
		qobj.fstr = " WHERE " + qobj.fstr;
	CountCards(qobj);

}

program
	.usage('<mode> table [options]')
	//modes only pick one
	.option('-S, --search <table>', 'search card mode') //R Done
	.option('-E, --edit <table> ', 'edit attribute information of a table')//U
	.option('-C, --count', 'count card mode')//R Done
	.option('-A, --add <table>', 'add entries to a table')//C
	.option('-M, --move', 'move card in inventory')//U
	.option('-R, --remove <table>', 'remove card from inventory')//D should have warning in place
	//attributes
	.option('-b, --boosterCode <code...>', 'filter by booster pack / starter deck code. Ex. BT3, ST5.')
	.option('-B, --boosterName <name...>', 'filter by booster pack / starter deck exact name.')
	.option('-c, --cardNumber <input...>', 'filter by card number. Ex. BT3-012.')
	.option('-n, --cardName <name...>', 'filter by card name. Ex. "Agumon".')
	.option('-t, --type <type...>', 'filter by card type.')
	.option('-k, --color <color...>', 'filter by color.')
	.option('-r, --rarity <rarity...>', 'filter by rarity.')
	.option('-l, --location <loc...>', 'filter by location.')
	.option('-q, --quantity <number>', 'how many cards to Add, update, move, or remove')

program.parse(process.argv);

const options = program.opts();
// Select(["name", "number"], ["Card"], {fstr: " WHERE (name = ?)", qarr:["Agumon"]}," JOIN CardSet ON 1 = 1")

//Search mode / Read / Done
if(options.search && !options.edit && !options.add && !options.count && !options.move && !options.remove){
	console.log("S",options.search)
	if(options.search == "Card"|| options.search == "CardLocation" || options.search == "CardSet" || options.search == "Location")
		RunSearchQuery(options.search, options)
	else
		console.log("error: No table was specified.")
}	
//Edit mode / Update
else if(!options.search && options.edit && !options.add && !options.count && !options.move && !options.remove){
	console.log("E",options.edit)

}
//Add mode / Create
else if(!options.search && !options.edit && options.add && !options.count && !options.move && !options.remove){
	console.log("A",options.add)
	console.log(options)
	if(options.add == "Card")
	{
		values = {}
		qarr = []
		for (let o in options){
			switch(o){
				case "cardNumber":
					values["number"] = options[o][0]
				break;
				case "cardName":
					values["name"] = options[o][0]
					break;
				case "type":
				case "color":
				case "rarity":
					values[o] = options[o][0];
					break;
	
		
			}
		}
		qarr = [values, values["number"].split("-")[0]]
		// console.log(qarr)
		InsertCard(qarr)
	}
	else if(options.add == "Location"){

	}
}
//Count mode / Read / Done
else if(!options.search && !options.edit && !options.add && options.count && !options.move && !options.remove){
	console.log("C",options.count)
	RunCountQuery(options)
}
//Move mode / Update
else if(!options.search && !options.edit && !options.add && !options.count && options.move && !options.remove){
	console.log("M",options.move)

}
//Remove mode / Delete
else if(!options.search && !options.edit && !options.add && !options.count && !options.move && options.remove){
	console.log("R",options.remove)

}
//Everything else
else{
	console.log("oops")
}



