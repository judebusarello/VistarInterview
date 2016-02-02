# VistarInterview

This is a programming puzzle I did for a Vistar interview.

Locate the State
==================

Write a server which, given a point, will identify its location in the USA by returning the containing State. 

For example: given latitude=40.513799 and longitude=-77.036133, the server should respond with "Pennsylvania".

States.json contains the names and approximate geometries of all 50 states.

Inputs:
  The latitude and longitude

Output:
  The state(if any) which contains that point
  
## Expected Behavior

  $ node HTTPServer.js &
  $ curl -d "longitude=-77.036133&latitude=40.513799" http://localhost:8080/
  "Pennsylvania"
