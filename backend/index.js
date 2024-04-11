const PORT = 4000;
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors')
const app = express();
app.use(express.json())
app.use(cors())


// connect database 
mongoose.connect("mongodb+srv://shanesiby:paYjoJH0HMukEKxB@ecommerce.j6z1kd6.mongodb.net/ECOMMERCE?retryWrites=true&w=majority&appName=ecommerce")

//* create API 

app.get("/",(req,res)=>{
res.send("EXPRESS")
})

// *IMAGE STORAGE ENGINE 
const storage = multer.diskStorage({
    destination:"./upload/images",
    filename:(req,file,cb)=>{
return cb(null,`${file.fieldname}_${Date.now()}_${path.extname(file.originalname)}`)
    }
})
const upload = multer({storage:storage});

//! creating upload endpoint for images
app.use('/images', express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${PORT}/images/${req.file.filename}`
    })
})

//! schema for creating Products 
const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },    
    category:{
        type:String,
        required:true
    },
    new_price:{
        type:Number,
        required:true
    },
    old_price:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    },
    available:{
        type:Boolean,
        default:true
    }
})

app.post("/addproduct",async (req, res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }else{
        id=1;
    }
  const product = new Product({
    id:id,
    name:req.body.name,
    image:req.body.image,
    category:req.body.category,
    new_price:req.body.new_price,
    old_price:req.body.old_price,
  });

  console.log(product);
  await product.save();
  console.log("saved");
  res.json({
    success:true,
    name:req.body.name,
  })
})

//! creating api for deleting products

app.post('/removeproduct' ,async(req,res)=>{
     await Product.findOneAndDelete({id:req.body.id});
     console.log("removed");
     res.json({
        success:true,
        name:req.body.name
     })
})

//!  create api to get all products
app.get('/allproducts', async(req ,res)=>{
    let products = await Product.find({})
    console.log("All products fetched");
res.send(products)
})

//! creating schema for usermodel

const Users = mongoose.model('Users',{
    name:{
        type:String
    },
    email:{
        type:String,
        unique:true
    },
    password:{
        type:String
    },
    cartData:{
        type:Object
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//! creating endpoint for registering the user
app.post('/signup', async(req,res)=>{
     

let check = await Users.findOne({email:req.body.email});
if(check){
   return res.status(400).json({success:false, errors:"existing user found with these login credentials"});
}
   let cart ={};
        for (let i =0; i < 300; i++) {
           cart[i]=0;

        }
            const user = new Users({
                name:req.body.username,
                email:req.body.email,
                password:req.body.password,
                cartData:cart,
            })

      await user.save();

      const data = {
        user:{
            id:user.id,
        }
      }

const token = jwt.sign(data,'secret_ecom');
res.json({success:true,token})

}) 
//! creating endpoint for userlogin
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passComapre = req.body.password === user.password;
        if (passComapre) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom')
    res.json({success:true,token});
        
        }else{
            res.json({success:false,errors:"invalid login credentials!"})
        }

    }else{
        res.json({success:false,errors:"invalid login credentials!(e)"})
    }

}) 

//! creating endpoint for newCollection data

// app.get('/newcollections' ,async (req,res)=>{
//      let products = Product.find({});
//     let newCollection = await products.slice(1).slice(-8)
//     console.log('newCollection fetched');
//     res.send(newCollection);
// })

app.get('/newcollections', async (req, res) => {
    try {
        let products = await Product.find({});
        let newCollection = products.slice(1).slice(-8);
        console.log('newCollection fetched');
        res.send(newCollection);
    } catch (error) {
        console.error('Error fetching new collections:', error);
        res.status(500).send('Internal Server Error');
    }
});

//! creating endpoint for popular in women category
app.get('/popularinwomen', async (req,res)=>{
   try{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("popular in women fetched");
    res.send(popular_in_women)
   }catch(error){
    console.error('Error fetching popular in women:', error);
    res.status(500).send('Internal Server Error');
   }
})

//! creating middleware to fetch user
const fetchUser = async(req,res,next)=>{
        const token = req.header('auth-token');
        if (!token) {
            res.status(401).send({errors:"please authenticate using valid token"})
        }else{
try {
    const data = jwt.verify(token,'secret_ecom');
    req.user = data.user;
    next();
} catch (error) {
    res.status(401).send({errors:"please authenticate using valid token"})
}
        }
}


//! creating endpoint to add products in cart data
app.post("/addtocart",fetchUser,async(req,res)=>{
    console.log("ADDED",req.body.itemId);
    //  console.log(req.body,req.user);
       let userData = await Users.findOne({_id:req.user.id});
         userData.cartData[req.body.itemId] +=1;
         await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
         res.send('Added')
})

//! creating endpoint to remove products from cart data
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("REMOVED",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send('Removed')
})
 
//! creating endpoint to retrieve from cart data
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log('get cart');
    let userData =await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})




app.listen(PORT,(error)=>{
    if(!error){
console.log(`http://localhost:${PORT}`);
    }else{
        console.error("ERROR :" +error);
    }
});
