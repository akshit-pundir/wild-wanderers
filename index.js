
if(process.env.NODE_ENV !=="production"){

    require('dotenv').config();

}



const express=require("express");
const path=require("path");
const mongoose=require("mongoose")
const methodOveride=require('method-override');
const ejsMate=require("ejs-mate");
const ExpressError=require("./utilities/ExpressError")
const session=require("express-session");
const flash=require("connect-flash");
const campgroundsRoute=require("./routes/campgrounds");
const reviewRoute=require("./routes/review");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user");
const mongoSanitize=require("express-mongo-sanitize");
const UserRoute=require('./routes/userAuth');
const helmet=require("helmet");

const MongoStore = require('connect-mongo');


const dbURL=process.env.DB_URL ;  
// const tempUrl='mongodb://127.0.0.1:27017/yelp-camp';

mongoose.connect(dbURL ,{ useNewUrlParser: true, useUnifiedTopology: true})

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app=express();

app.use(express.urlencoded( { extended:true }));
app.use(methodOveride('_method'));
app.engine("ejs",ejsMate);

app.use(mongoSanitize({
    replaceWith: '_',
  }));

  
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
 
const store= MongoStore.create({
    mongoUrl:dbURL,
    touchAfter:24*60*60,
    crypto: {
        secret:"thisIsASecret"
    }
}) 

store.on("error" ,function(e){
    console.log("session store error" , e );
} )

const sessionConfig = {
      store,
      name:'session',
      secret:"thisIsASecret",
      resave:false,
      saveUninitialized: true,
      cookie: {
          HttpOnly:true,
          // secure:true,
          expires:Date.now()+ 1000 * 60 * 60 * 24 * 7,
          maxAge:1000 * 60 * 60 * 24 * 7
        }
        
 }
    
    app.use(helmet());

    const scriptSrcUrls = [
        "https://stackpath.bootstrapcdn.com/",
        "https://api.tiles.mapbox.com/",
        "https://api.mapbox.com/",
        "https://kit.fontawesome.com/",
        "https://cdnjs.cloudflare.com/",
        "https://cdn.jsdelivr.net",
    ];
    //This is the array that needs added to
    const styleSrcUrls = [
        "https://kit-free.fontawesome.com/",
        "https://api.mapbox.com/",
        "https://api.tiles.mapbox.com/",
        "https://fonts.googleapis.com/",
        "https://use.fontawesome.com/",
        "https://cdn.jsdelivr.net",
    ];
    const connectSrcUrls = [
        "https://api.mapbox.com/",
        "https://a.tiles.mapbox.com/",
        "https://b.tiles.mapbox.com/",
        "https://events.mapbox.com/",
    ];
    const fontSrcUrls = [];
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: [],
                connectSrc: ["'self'", ...connectSrcUrls],
                scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
                styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
                workerSrc: ["'self'", "blob:"],
                objectSrc: [],
                imgSrc: [
                    "'self'",
                    "blob:",
                    "data:",
                    "https://res.cloudinary.com/drxvblkym/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                    "https://images.unsplash.com/",
                ],
                fontSrc: ["'self'", ...fontSrcUrls],
            },
        })
    );

    

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()  ));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req,res,next)=>{
    
    res.locals.currentUser=req.user;
    res.locals.success= req.flash('success');
    res.locals.error=req.flash('error');
    next();

});




app.use('/',UserRoute);


app.use('/campgrounds',campgroundsRoute);
app.use('/campgrounds/:id/review',reviewRoute);
app.use(express.static(path.join(__dirname, 'public')));



app.get('/',(req,res)=>{

    res.render('home');

})  

app.all("*",(req,res,next)=>{

    next(new ExpressError('page not found',404));


})


app.use((err,req,res,next)=>{

    const { StatusCode=500  }=err;
        if(!err.message){
            err.message="oh no something went wrong!";
        }

    res.status(StatusCode).render('campground/error', { err });
    

})






app.listen(3000,()=>{

    console.log("THE WEBSITE IS NOW LIVE !!");

})
