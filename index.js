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
// var connection = require("./config/config.js");
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
function SelectCard(options){
	sqlobj = {
		sql: "SELECT Card.* FROM Card JOIN CardSet ON CardSet.id = cardSetId"+options.fstr,
		values: options.qarr,
		nestTables: true,

	}
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
	connection.query(sqlobj,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
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

program
	.usage('<mode> table [options]')
	//modes only pick one
	.option('-S, --search <table>', 'search card mode') //R
	.option('-E, --edit <table> ', 'find card in location mode')//R
	.option('-C, --count', 'count card mode')//R
	.option('-A, --add <table>', 'add card mode')//C
	.option('-M, --move', 'move card in inventory')//U
	.option('-R, --remove <table>', 'remove card from inventory')//D
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

//Search mode
if(options.search && !options.edit && !options.add && !options.count && !options.move && !options.remove){
	console.log("S",options.search)
	qobj = {fstr:"", qarr:[]}
	switch(options.search){
		

		case "Card":

			for (let o in options){
				
				switch(o){
					case "boosterCode":
						qobj = buildQuery(qobj, "cs.number = ?", options[o])
						break;
					case "boosterName":
						qobj = buildQuery(qobj, "cs.name LIKE %?%", options[o])
						break;
					case "cardNumber":
						qobj = buildQuery(qobj, "c.number = ?", options[o])
						break;
					case "cardName":
						qobj = buildQuery(qobj, "c.name = ?", options[o])
						break;
					case "type":
						qobj = buildQuery(qobj, "type = ?", options[o])
						break;
					case "color":
						qobj = buildQuery(qobj, "color = ?", options[o])
						break;
					case "rarity":
						qobj = buildQuery(qobj, "rarity = ?", options[o])
						break;
					case "location":
						qobj = buildQuery(qobj, "locationName = ?", options[o])
						break;
				}//end of switch
			}		

		break;
		case "CardSet":
				// qobj = {fstr:"", qarr:[]}

			for (let o in options){
				// console.log(options[o])
				
				switch(o){
					case "boosterCode":
						qobj = buildQuery(qobj, "cs.number = ?", options[o])
						break;
					case "boosterName":
						qobj = buildQuery(qobj, "cs.name LIKE %?%", options[o])
						break;
				}//end of switch
			}		

		break;
		case "Location":
				// qobj = {fstr:"", qarr:[]}

			for (let o in options){
				switch(o){
					case "location":
						qobj = buildQuery(qobj, "locationName = ?", options[o])
					break;
				}
			}
					

		break;
		case "CardLocation":
				// qobj = {fstr:"", qarr:[]}

			for (let o in options){
				switch(o){
					case "boosterCode":
						qobj = buildQuery(qobj, "cs.number = ?", options[o])
						break;
					case "boosterName":
						qobj = buildQuery(qobj, "cs.name LIKE %?%", options[o])
						break;
					case "cardNumber":
						qobj = buildQuery(qobj, "c.number = ?", options[o])
						break;
					case "cardName":
						qobj = buildQuery(qobj, "c.name = ?", options[o])
						break;
					case "type":
						qobj = buildQuery(qobj, "type = ?", options[o])
						break;
					case "color":
						qobj = buildQuery(qobj, "color = ?", options[o])
						break;
					case "rarity":
						qobj = buildQuery(qobj, "rarity = ?", options[o])
						break;
					case "location":
						qobj = buildQuery(qobj, "locationName = ?", options[o])
						break;
				}//end of switch
			}
			

		break;
		

	}//mode switch
	console.log(qobj)
}	
//Edit mode
else if(!options.search && options.edit && !options.add && !options.count && !options.move && !options.remove){
	console.log("E",options.edit)

}
//Add mode
else if(!options.search && !options.edit && options.add && !options.count && !options.move && !options.remove){
	console.log("A",options.add)

}
//Count mode
else if(!options.search && !options.edit && !options.add && options.count && !options.move && !options.remove){
	console.log("C",options.count)

}
//Move mode
else if(!options.search && !options.edit && !options.add && !options.count && options.move && !options.remove){
	console.log("M",options.move)

}
//Remove mode
else if(!options.search && !options.edit && !options.add && !options.count && !options.move && options.remove){
	console.log("R",options.remove)

}
//Everything else
else{
	console.log("oops")
}

//Test Query
// SelectCard({fstr:" WHERE Card.name = ?", qarr:["Agumon"]});
// connection.query("SELECT * FROM CARD WHERE name = 'Agumon'", (err, rows, fields)=>{
// 	if(err){
// 		console.log(err.stack)
// 	}
// 	console.log(rows)
// 	connection.end((err)=>{
// 		if(err){
// 			console.error("error connecting: "+err.stack);
// 			return;
// 		}
// 		console.log("DB closing");
// 	})
// })

