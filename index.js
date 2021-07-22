// Commander + Axios + MySQL2

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
			(cardNumber) => Put{cardNumber, cardName, cardColor, cardType, cardRarity, CardSetNumber}
			//without internet
			(cardNumber, cardName, cardColor, cardType, cardRarity) => Put{cardNumber, cardName, cardColor, cardType, cardRarity, cardSetNumber}

		Read Card info 
			(Query inputs) => Get{CardNumber, CardName, cardColor, cardType cardRarity}
			(*)=> GET ALL {CardNumber, CardName, cardColor, cardType cardRarity}
		Update card information
			(cardNumber, {attr1: [old, new],...}) => {}
		Delete card
			(cardNumber)=> {}

	Location:
		Insert new location
			(locationName) => Put{LocationName}
		Read Location info
			(locationName) => GET{LocationId, Location Name}
			(*)=GET ALL {LocationId, Location Name}
		Update location
			(locationName, newLocationName) => {}
		Delete location
			(locationID) => {}
	Inventory:
		Insert new entry
			(cardNumber, LocationName, quantity) => PUT{cardNamber, LocationID, quantity}
		Read Inventory info
			(queary) = > GET {quantity, cardNumber, CardName, Color, Location}
		Update quantity
			(cardnumber, location, increment) => INCR{quantity}
			(cardnumber, location, new value) => SET{Quantity}
		Update card location
			(cardnumber, location, newlocation, quantitymoved) => UPDATE{}
		Remove card from location
			(cardNumber, LocationID)=> {}

*/

