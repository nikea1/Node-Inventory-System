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
			//With internet csv-parser?

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
const fs = require("fs"), rl = require("readline");

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

function InnerJoin(table1, table2, attr1, attr2){
	if(!table1 || !table2 || !attr1 || !attr2)
		return ""
	return " JOIN "+table2+" ON "+table1+"."+attr1+" = "+table2+"."+attr2
}

function Select(col,from, where=null, join=null){
	if(!col || !from)
		return null;
	qobj = {}
	jstr = ""

	//if join is a String
	if(typeof join === 'string' || join instanceof String){
		jstr = join;
	}
	//of join is an object
	else if(join && join.table1 && join.table2 && join.attr1 && join.attr2){
		jstr = " JOIN "+join.table2+" ON "+join.table1+"."+join.attr1+" = "+join.table2+"."+join.attr2;
	}
	//if join is a list of objects
	else if(Array.isArray(join)){
		join.forEach((j)=>{
			if(j && j.table1 && j.table2 && j.attr1 && j.attr2){
				jstr += " JOIN "+j.table2+" ON "+j.table1+"."+j.attr1+" = "+j.table2+"."+j.attr2;
			}
			else if(typeof j === 'string' || j instanceof String){
				jstr += j;
			}
			else{
				console.log("Warning: Found an unprepared join object.")
			}
		})
	}
	
	

	qobj["sql"] = "SELECT ?? FROM ??"+jstr+(where && where.fstr ? where.fstr : "")
	qobj["values"] = []
	qobj.values.push(col);
	qobj.values.push(from);
	if(where && where.qarr)
		qobj.values = qobj.values.concat(where.qarr);
	return qobj;
	
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
		// sql: "INSERT INTO Card SET Card.number = ?, Card.name = ?, color = ?, type = ?, rarity = ?, CardsetId = (SELECT CardSet.id FROM CardSet WHERE CardSet.number =  ?)",
		// sql: "INSERT INTO Card (Card.number, Card.name, color, type, rarity, cardSetId) VALUES ?",
		values: values
	}
	console.log(sqlobj)
	connection.query(sqlobj,(err,res,fields)=>{
		if(err) console.log(err)

		console.log(res);
		closeDB();
	})
}

function InsertCard2(cardNumber){
	var config = {
	  method: 'get',
	  // url: 'https://digimoncard.io/api-public/search.php?n=Agumon&desc=Reveal 5 cards&color=red&type=digimon&attribute=Vaccine&card=BT1-010&pack=BT01-03: Release Special Booster Ver.1.0&sort=name&sortdirection=desc&series=Digimon Card Game',
	  url: 'https://digimoncard.io/api-public/search.php',
	  headers: { },
	  params:{card:cardNumber, series:"Digimon Card Game"}
	};
	axios(config)
	.then(function (response) {
		data = {
			number: response.data[0].cardnumber,
			name: response.data[0].name,
			color: response.data[0].color,
			type: response.data[0].type,
			rarity: RARITY[response.data[0].cardrarity] ? RARITY[response.data[0].cardrarity] : null,
			
		}
		 console.log(data)
		InsertCard([data, data['number'].split('-')[0]])
	})
	.catch(function (error) {
	  console.log(error);
	  console.log("Connection")
	});
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

function InsertCardIntoLocation(values){
	sqlobj = {
		sql:"INSERT INTO CardLocation SET ?",
		values: values
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
	test={}
	if(mode == "Card"){
		// SelectCard(qobj)
		test = Select("Card.*","Card",qobj,InnerJoin("Card","CardSet","cardSetId", "id"))
		console.log(test)
	}
	else if(mode == "Location"){
		// SelectLocation(qobj)
		test = Select("*","Location",qobj)
		console.log(test);
	}
	else if(mode == "CardLocation"){
		// SelectCardFromLocation(qobj)
		test = Select(["Card.*", "quantity", "locationName"],"CardLocation",qobj,[InnerJoin("CardLocation","Location","locationId","id"),InnerJoin("CardLocation","Card","cardNumber","number"),InnerJoin("Card","CardSet","cardSetId","id")])
		console.log(test)
	}
	else if(mode == "CardSet"){
		// SelectCardSet(qobj)
		test = Select("*","CardSet",qobj);
		console.log(test)
	}
	connection.query(test,(err,rows,fields)=>{
		if(err) console.log(err)

		console.log(rows);
		closeDB();
	})

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
	.option('-i, --internet', 'For add Card only, uses internet to populate Card information')
	.option('-f, --file <filename>', 'Use file to provide information')

program.parse(process.argv);

const options = program.opts();
// Select(["name", "number"], ["Card"], {fstr: " WHERE (name = ?)", qarr:["Agumon"]}," JOIN CardSet ON 1 = 1")

//Search mode / Read / Done
if(options.search && !options.edit && !options.add && !options.count && !options.move && !options.remove){
	console.log("S",options.search)
	
	// qobj = OptionSwitch(options.search, options);
	// console.log(qobj);
	// if(qobj.fstr != "" && qobj.qarr != [])
	// 	qobj.fstr = " WHERE " + qobj.fstr;
	// GeneralSelect("Card.*", "Card", qobj, [InnerJoin("Card", "CardSet", "cardSetId", "id")]); // it works

	if(options.search == "Card"|| options.search == "CardLocation" || options.search == "CardSet" || options.search == "Location")
	
		RunSearchQuery(options.search, options)
	
	else
	
		console.log("error: No table was specified.")
}	
//Edit mode / Update
else if(!options.search && options.edit && !options.add && !options.count && !options.move && !options.remove){
	console.log("E",options.edit)

}
//Add mode / Create / Testing Needed
else if(!options.search && !options.edit && options.add && !options.count && !options.move && !options.remove){
	console.log("A",options.add)
	console.log(options)
	//Add new Cards/ Card number required / Done
	if(options.add.toUpperCase() == "CARD")
	{
		if(options.file){

			
			console.log(options.file);
			const reader = rl.createInterface({
				input: fs.createReadStream(options.file)
			});

			var arr = [];
			//read each line and split by comma into an array
			reader.on("line", (row) => {
				arr.push(row.split(','));
			});

			reader.on("close", () => {
				arr.shift()
				for(i=0;i<arr.length;i++){
					temp = {
						number: arr[i].shift(),
						name: arr[i].shift(),
						color: arr[i].shift(),
						type: arr[i].shift(),
						rarity: arr[i].shift(),
					}
					arr[i].unshift(temp)
				}
				console.log(arr);

				// InsertCard(arr[0])
				arr.forEach((data)=>{
					InsertCard(data)
				})
			})
		}
		//Use Axios to add card to database
		else if(options.internet && options.cardNumber){
			// InsertCard2(options['cardNumber'][0])
		}
		else{
			values = {}
			//User provided information
			if(options.cardNumber){
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
			
				
					}//switch
				}//for
				qarr = [values, values["number"].split("-")[0]]
				// console.log(qarr)
				InsertCard(qarr)
			}//if card Number
			else{
				console.log("Error: Must provide card number")
			}//else
		}//else not internet available
		
	}//Card
	//Add new Location/Need Location Name/ Testing
	else if(options.add == "Location"){
		// values = {}
		qarr = []
		if(options.location){
			values["locationName"] = options["location"][0];
			// InsertLocation([values])
		}
		else{
			console.log("Error: location was not given.")
		}
	}
	//Add new CardSet /need Card Set number/ Testing
	else if(options.add == "CardSet"){
		
		if(options.boosterNumber){
			values["number"] = options['boosterCode'][0]
		
			if(options.boosterName)
				values['name'] = options['boosterName'][0]

			
			// InsertCardSet([values])
		}
		else{
			console.log("Error: Must provide boosterCode/Cardset Number")
		}
	}
	//Add new Card into a Location / Need Card number, Location Id, quantity / Testing
	else if(options.add == "CardLocation"){
		if(options.cardNumber && options.location && options.quantity){
			values['cardNumber'] = options['cardNumber'][0]
			values['locationId'] = options['location'][0]
			values['quantity'] = options['quantity'][0]

			// InsertCardIntoLocation([values])
		}
		else{
			console.log("Error: Must provide card Number, location Id, and quantity. ")
		}
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



