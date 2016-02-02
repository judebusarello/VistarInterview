//import HTTP module (required for the server to run)
var http = require('http');
//import fs and path modules (required to read a file from the filesystem)
var fs = require('fs');
var path = require('path');




/*
 *
 * 1) Pre-processing before the server starts listening
 *
 * Prep the data for the server by reading the JSON file and parsing it into an array of javascript objects
 *
 */

//Take in the raw data as a string
var rawdata = fs.readFileSync('./states.json', 'utf8');

//Split the raw data into an array of seperate JSON objects
var JSONObjects = rawdata.trim().split("\n");

//Convert the JSON objects to Javascript objects
var ParsedObjects = JSONObjects.map(function (text) {return JSON.parse(text);});

/*
 *
 * 2) Start up the server
 *
 */


//Define the port we want to listen on
const PORT=8080; 

//Create the server
var server = http.createServer(handleRequest);

//Start listening
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening.
    console.log("Server listening on: http://localhost:%s", PORT);
});


/*
 *
 * 3) Handle incoming requests to the server and serve up the data
 *
 */


//We need a function which handles requests and send responses
function handleRequest(request, response){
    //As data comes in, we need to accumulate it and piece it together into the full POST
    requestBody = '';
    request.on('data', function (data) {
        requestBody += data;
    });


    //This function is called when the request is completely assembled and ready for processing 
    request.on('end', function () {
    	console.log('request' + requestBody);

	//Extract the longitude and latitude from the input 
	var values = requestBody.trim().split('&');
	var longitude = values[0].replace(/longitude=/g, '');
	var latitude  = values[1].replace(/latitude=/g, '');


	//Filter out all states that do not contain this point
	var StateObjects = ParsedObjects.filter(isWithinState(longitude, latitude));

	//Now pull the names out of each of the objects in the filtered array
	result = StateObjects.map(function (object) {return object.state;});

	//Respond with the answer
	response.end(result.toString());
    });
}

//Helper function for weeding out states that do not contain a given point.
//It basically just wraps up the pointExistsInGeometry() function in a way that javascript's filter() function will play nice with.
function isWithinState(longitude, latitude) {
    return function(value, index, array) {
        if(pointExistsInGeometry(longitude, latitude, value.border)) {
            return true;
        } else {
	    return false;
	}
    }
}






/**************************************
 *
 *
 * BELOW IS THE MEAT. 
 *
 * This is where we determine whether the location is within one of the states.
 *
 * We use the Ray-Casting algorithm to find out if a point exists in a state, then return True/False.
 * 
 * This is hard to explain in comments(even though I tried). This is the site that made it click for me:
 * http://rosettacode.org/wiki/Ray-casting_algorithm
 *
 *************************************/



function pointExistsInGeometry(x, y, borders){

    var ray = [x, y];
    var intersectionCount = 0;
    var arrayLen = borders.length;

    for(i = 0; i < borders.length; i++){
	    //Take the two points in a segment
            //Aside: The mod is so the index will loop around and find borders[0] instead of falling off the end of the array at borders[borders.length]
	    pointA = borders[i] 
            pointB = borders[(i+1) % arrayLen]; 

            if(rayIntersectsSegment(ray, pointA, pointB)){
		    intersectionCount++;
	    }
    }


    //If we passed through an odd number of segments, we are within the polygon. Otherwise false.
    if(intersectionCount % 2 == 1){
	    return true;
    }
    else {
	    return false;
    }

}

//this function determines if a horizontal ray propogating right will intersect the segment made by pointA and pointB
function rayIntersectsSegment(ray, pointA, pointB){
	ray.x = ray[0];
	ray.y = ray[1];
	pointA.x = pointA[0];
	pointA.y = pointA[1];
	pointB.x = pointB[0];
	pointB.y = pointB[1];

	//First decide which point is at the top of the segment on the Y-axis.
	var segmentTop = pointA;
	var segmentBot = pointB;
	if(pointA.y < pointB.y){
		segmentTop = pointB;
		segmentBot = pointA;
	}

	//Having a "tie" on the Y-axis can result in some weird stuff. we'll resolve it by making the ray "win" in the case of a tie with one of the endpoints.
	if(ray.y == segmentTop.y || ray.y == segmentBot.y){
		ray.y = ray.y + .000001;
	}

	//Figure out if the ray is above(or below) the segment on the Y-axis (never intersects)
	if(ray.y > segmentTop.y || ray.y < segmentBot.y){
		return false;
	}

	//We now know that the ray is within the bounds of the segment on the Y-axis
	//Figure out if the ray is OBVIOUSLY right of the segment on the X-axis meaning that it'll never intersect the segment
	if(ray.x > Math.max(segmentTop.x, segmentBot.x)){
		return false;
	}

	//Figure out if the ray is OBVIOUSLY left of the segment on the X-axis meaning that it'll definitely intersect the segment
	if(ray.x < Math.min(segmentTop.x, segmentBot.x)){
		return true;
	}

	//Below are the cases where we are pretty close to the segment, so we have to do some fancy footwork.
	//
	//The idea is that first we calculate an acute angle composed of segment(segmentBot) as the vertex, a line extending horizontally to the right, and a line extending to the other point(segmentTop)
	//Then we an acute angle composed of segmentBot as the vertex(again), a line extending horizontally to the right(again), and a line extending to the point we're testing(ray)
	//
	//Not working for you?
	//Think of it as a clock
	//The center of the clock is the vertex(segmentBot) 
	//both the minute and hour hands start pointing at 3:00 (the horizontal)
	//Now rotate the minute hand counterclockwise to point to the location we're checking (ray)
	//Now rotate the hour hand counterclockwise to point to the other point in the segment(segmentTop)
	//Assuming the hands never pass 9:00, we can safely say that whoever we moved farther(AKA has the bigger angle) lies to the LEFT of the other.
	//
	//
	//Caveat: This is only useful if the angles never pass 9:00
	//Luckily, the angles will never pass 9:00 for the following reasons:
	//Since the vertex(the center of the clock) is BY DEFINITION lower on the y-axis than the other point(segmentTop), we KNOW the hour hand is pointing up.
	//And since the point we're testing is BY DEFINITION between the two points on the y-axis(we checked earlier), then it means the vertex(center of the clock AKA segmentBot) is below us as well.
	//Again, because the vertex is lower than the point itself, it FORCES the minute hand to point up as well.
	//This means that they cannot ever pass 9:00, and we can compare the angles. SO SIMPLE.
	//
	//
	//
	// TL;DR whoever has the larger angle lies to the left.

	var angleToSegment = Number.POSITIVE_INFINITY; //we will default to infinity in case we were about to divide-by-zero in the denominator
	if(segmentTop.x != segmentBot.x){
		angleToSegment = (segmentTop.y - segmentBot.y) / (segmentTop.x - segmentBot.x);
	} 

	var angleToRay = Number.POSITIVE_INFINITY; //we will default to infinity in case we were about to divide-by-zero in the denominator
	if(segmentTop.x != ray.x){
		angleToRay = (ray.y - segmentBot.y) / (ray.x - segmentBot.x);
	} 


	//if the ray falls to the left of the segment, then return true
	if(angleToRay >= angleToSegment){
		return true;
	}
	else {
		return false;
	}
}

