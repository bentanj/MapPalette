Hey thanks for reading this READ ME!

Here is our apps website:

https://mappalette.web.app/

Steps on how to set up our website (Idk what's going on, I'm just following chatGPT):

1. clone repo
   git clone https://github.com/yourusername/MapPalette.git
   cd MapPalette

2. Have firebase installed
   npm install -g firebase-tools

3. Install npm for root, and also in the "public" and "functions" folder. (By right functions folder should be able to access node_modules in root, but couldn't get that to work)

   npm install
   ^run this for root, public and functions

4. Log into firebase:
   firebase login
   firebase init
   firebase deploy

For firebase login, our admin account is:
email => wad2shared@gmail.com
password => ilovewebapplication123
Project name => mappalette-9e0bd (I think)

How our files are split (mainly 3 important areas):

1. /public
   front-end
   Where our website's root resides
   Landing zone is index.html
   has navbar and footer folders containing .js files that are imported into other pages

2. /functions
   back-end
   index.js contains all our endpoint APIs

   IMPORTANT!!!!!!
   We have a PostMan documentation listing all our APIs and what they do. Postman account details are:
   email => wad2shared@gmail.com
   password => ilovewebapplication1234
   Can test whatever you want, mess with our database we are chill.

3. ~ (root)
   Our firebase files are here i think(?)

Any questions on how our website works, please direct it to me! (The group leader, Benjamin Daniel Loh Wayne)

KNOWN BUGS/USER ISSUES:

1. SOCIAL MEDIA LINKS NOT WORKING IN FOOTER
   Ssee the funny thing is we actually did have social media accounts made, buuuuut they got suspended after awhile :P so we had to scrap it. Links go back to the top of the page.

2) LONG LOAD TIMES
   Loading bar hides this? The reason it takes awhile to pull all our data is due to the amount of attributes and subcollections each object has. (for users and posts)

3) BOUNTYRUSH NOT ACTUALLY INCORPORATED INTO BACK-END
   Bountyrush is supposedly a faster way to make backend API calls. However by the time we found out, was 2 days to submission. Bountyrush API syntax completely different from normal firebase, so I could have imeplemented it, but no time to test, too risky.
