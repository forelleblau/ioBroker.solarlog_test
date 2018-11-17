/**
 * solarlog adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = new utils.Adapter('solarlog');
var https = require('http'); 
var names =[];

let polling;


// when adapter shuts down
adapter.on('unload', function (callback) {
    try {
        clearInterval(polling);
        adapter.log.info('[END] Stopping solarlog adapter...');
        adapter.setState('info.connection', false, true);
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            adapter.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
adapter.on('ready', function() {
    if (adapter.config.host) {  
        adapter.log.info('[START] Starting solarlog adapter');
        main();
    } else adapter.log.warn('[START] No IP-address set');
});


function main() {
    // Vars
    const DeviceIpAdress = adapter.config.host;
    const cmd = "/getjp"; // Kommandos in der URL nach der Host-Adresse
    var statusuz ="on";
	var numinv = 0;
	var data='{"608":null}';
	var options = {
		host: deviceIpAdress,
		path: cmd,
		method: 'POST',
		headers: {
			'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
			'Content-Type': 'application/json',
			'Accept': 'applciation/json',
			'Content-Length': data.length
		}
	};   
    const pollingTime = adapter.config.pollInterval || 300000;
    adapter.log.debug('[INFO] Configured polling interval: ' + pollingTime);
    adapter.log.debug('[START] Started Adapter with: ' + adapter.config.host);
	
	adapter.log.debug("Options: " + JSON.stringify(options));
	adapter.log.debug("Data: " + JSON.stringify(data));

    httpsReqNumInv(data, options, defobjUZ()); //Anlegen eines Channels pro Unterzähler mit den Objekten Wert und Status
	
	httpsReqDataStandard(cmd, options); //abfragen der Standart-Werte
	
	setTimeout(objtest(),5000); //Test ob Unterzähler - Objekte angelegt, wenn ja, Abfrage der Werte.
	
	//überprüfung ob Namen der vorhandenen Unterzähler alle in Names enthalten sind, sonst löschen.
	
	httpsReqDataUZ(options);

	
    if (!polling) {
        polling = setTimeout(function repeat() { // poll states every [30] seconds
            httpsReqDataStandard(cmd, options, );
			setTimeout(httpsReqDataUZ(cmd, options),3000);
			setTimeout(repeat, pollingTime);
        }, pollingTime);
    } // endIf
	
    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

   
} // endMain	

function objtest(){  //Prüft ob alle Objekte angelegt sind und löst die Ermittlung der Werte aus, wenn erfüllt.
	var j = 1;
	if (names.foreach(uz) {adapter.getObject('INV.' + uz);}){
		httpsReqDataUZ(cmd, options);
	clearInterval();
		  } 
	else {
		while(j<20){
			adapter.log.debug("Anlegen der Unterzähler - Objete noch nicht abgeschlossen");
			j++;
			if (names.foreach(uz) {adapter.getObject('INV.' + uz);}){
				httpsReqDataUZ(cmd, options);
				clearInterval();
				} //endIf
		}
		adapter.log.warn("Fehler: Unterzähler - Objekte nicht richtig angelegt");
		clearInterval();
		}
} // End objtest


function httpsReqNumInv(data, options) { //Ermittelt die Anzahl Unterzähler und löst das Anlegen der Channels/Objekte aus.
	var req = https.request(options, function(res) {
    adapter.log.debug("http Status: " + res.statusCode);
    adapter.log.debug('HEADERS: ' + JSON.stringify(res.headers), (res.statusCode != 200 ? "warn" : "info")); // Header (RÃ¼ckmeldung vom Webserver)
    var bodyChunks  = [];
    var chunkLine   = 0;
    res.on('data', function(chunk) {
        chunkLine = chunkLine + 1;
        // Hier kÃ¶nnen die einzelnen Zeilen verarbeitet werden...
        bodyChunks.push(chunk);

    }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        // ...und/oder das Gesamtergebnis (body).
        adapter.log.debug("body: " + body);
		try{
			dataJ=JSON.parse(body);
			while (statusuz != "OFFLINE" && numinv < 100) {
				statusuz = (dataJ[608][numinv.toString()]);  
					if (statusuz != "OFFLINE") {
					   adapter.log.debug(dataJ[608][numinv.toString()]);
					}
				numinv++;
				}
		} catch(e) {
				adapter.log.warn("JSON-parse-Fehler: " + e.message);
		}			
        adapter.setState('info.numinv'/*numinv*/,numinv-1,true);
        adapter.log.debug("Numer of Inverters/Meters :" + numinv);
		adapter.log.debug("END Request: " + JSON.stringify(data));
          
        defobjUZ(numinv); 
    });   
}); 
 req.on('error', function(e) { // Fehler abfangen
        adapter.log.warn('ERROR: ' + e.message,"warn");
        });

    adapter.log.warn("Data to request body: " + data);
    // write data to request body
    (data ? req.write(data) : adapter.log.warn("Daten: keine Daten im Body angegeben angegeben"));
 req.end();              
  
} //end httpsReqNumInv

function defobjUZ(numinv){ //Schlaufe mit Abfrage der Information pro Unterzähler und auslösen der Objekterstellung
    for (i=0; i<numinv-1;i++) {
		var data1 = '{"141":{"';
		var data2 = '":{"119":null}}}';
		var data = data1 + i.toString() + data2;
		var options = {
			host: deviceIpAdress,
			path: cmd,
			method: 'POST',
			headers: {
					'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
					'Content-Type': 'application/json',
					'Accept': 'applciation/json',
					'Content-Length': data.length
					}
			};
			
		adapter.log.debug("Options: " + JSON.stringify(options));
		adapter.log.debug("Data: " + JSON.stringify(data));
		
		httpsReqSetUZ(data, options, i);
    }  
} //end defobjUZ

function httpsReqSetUZ(data, options, i) { //erstellt die Channels und Objekte pro Unterzähler
    var req = https.request(options, function(res) {
    adapter.log.debug("http Status: " + res.statusCode);
    adapter.log.debug('HEADERS: ' + JSON.stringify(res.headers), (res.statusCode != 200 ? "warn" : "info")); // Header (Rückmeldung vom Webserver)
	var bodyChunks  = [];
    var chunkLine   = 0;
    res.on('data', function(chunk) {
        chunkLine = chunkLine + 1;
        // Hier können die einzelnen Zeilen verarbeitet werden...
        bodyChunks.push(chunk);

    }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        // ...und/oder das Gesamtergebnis (body).
        adapter.log.debug("body: " + body);
        try{
			var dataJ = (JSON.parse(body));
                
				

// create Channel DeviceID
    adapter.setObjectNotExists('INV.', {
        type: 'channel',
        role: '',
        common: {
            name: (dataJ[141][i.toString()][119])
        },
        native: {}
    });
    // create States
    adapter.setObjectNotExists('INV.' + (dataJ[141][i.toString()][119]),{
        type: 'state',
        common: {
            name: 'PAC',
            desc: 'Power AC',
            type: 'number',
            read: true,
            write: false
        },
        native: {}
    });
	
	// create States
    adapter.setObjectNotExists('INV.' + (dataJ[141][i.toString()][119]),{
        type: 'state',
        common: {
            name: 'status',
            desc: 'Staus of Inverter',
            type: 'string',
            read: true,
            write: false
        },
        native: {}
    });
	
	// create States
    adapter.setObjectNotExists('INV.' + (dataJ[141][i.toString()][119]),{
        type: 'state',
        common: {
            name: 'statusSE',
            desc: 'Staus Smart Energy',
            type: 'string',
            read: true,
            write: false
        },
        native: {}
    });
            names.push(dataJ[141][i.toString()][119]);
		} catch(e) {
			adapter.log.warn("JSON-parse-Fehler: " + e.message);
		}
     
        });

    });
    
    req.on('error', function(e) { // Fehler abfangen
        adapter.log.warn('ERROR: ' + e.message,"warn");
    });

    adapter.log.debug("Data to request body: " + data);
    // write data to request body
    (data ? req.write(data) : adapter.log.warn("Daten: keine Daten im Body angegeben angegeben"));
        
    req.end();
} //End httpsReqSetUZ


function httpsReqDataStandard(cmd, options) { //Abfrage der Standardwerte
	var data = '{"801":{"170":null}}';
	var req = https.request(options, function(res) {
    adapter.log.debug("http Status: " + res.statusCode);
    adapter.log.debug('HEADERS: ' + JSON.stringify(res.headers), (res.statusCode != 200 ? "warn" : "info")); // Header (Rückmeldung vom Webserver)
    var bodyChunks  = [];
    var chunkLine   = 0;
    res.on('data', function(chunk) {
        chunkLine = chunkLine + 1;
        // Hier können die einzelnen Zeilen verarbeitet werden...
        bodyChunks.push(chunk);
    }).on('end', function() {
		adapter.log.debug("no more date in response");
   	
        var body = Buffer.concat(bodyChunks);
        // ...und/oder das Gesamtergebnis (body).
        
			try{
                var json = (JSON.parse(body));
				adapter.setState('info.lastSync', json[801][170][100] , true);
				adapter.setState('info.totalPower', json[801][170][116], true);
				adapter.setState('status.pac', json[801][170][101], true);
				adapter.setState('status.pdc', json[801][170][102], true);
				adapter.setState('status.uac', json[801][170][103], true);
				adapter.setState('status.udc', json[801][170][104], true);
				adapter.setState('status.conspac', json[801][170][110], true);
				adapter.setState('status.yieldday', json[801][170][105], true);
				adapter.setState('status.yieldyesterday', json[801][170][106], true);
				adapter.setState('status.yieldmonth', json[801][170][107], true);
				adapter.setState('status.yieldyear', json[801][170][108], true);
				adapter.setState('status.yieldtotal', json[801][170][109], true);
				adapter.setState('status.consyieldday', json[801][170][111], true);
				adapter.setState('status.consyieldyesterday', json[801][170][112], true);
				adapter.setState('status.consyieldmonth', json[801][170][113], true);
				adapter.setState('status.consyieldyear', json[801][170][114], true);
				adapter.setState('status.consyieldtotal', json[801][170][115], true);
			} catch(e) {
				adapter.log.warn("JSON-parse-Fehler: " + e.message);
			}
       });
	});
	
   
    req.on('error', function(e) { // Fehler abfangen
        adapter.log.debug('ERROR: ' + e.message,"warn");
    });

    adapter.log.debug("Data to request body: " + data);
    // write data to request body
    (data ? req.write(data) : adapter.log.debug("Daten: keine Daten im Body angegeben angegeben"));
    req.end();

} //end httpsReq()

function httpsReqDataUZ(cmd, options){ //Abfrage der Unterzählerwerte
	
	//*******************Abfragen der einzelnen Werte und Stati der Unterzähler
	
} //End httpsReqDataUZ
