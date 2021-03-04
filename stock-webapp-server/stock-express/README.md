We are using our local ip but it may change so i stored the local ip within the '.env' file.
If the localip changes recreate a selfsigned cert and change the ip within the '.env' file.
Also all server related stuff is handled within './bin/www'
So thats where u can find the http and https server inititations

currenlty http sever initations funcs are commented out at the bottom of the www file

http server = http://localhost:3001
https server = 'https://${process.end.LOCALIP}:443'
