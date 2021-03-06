const http = require('http')
const path = require ('path')
const express = require('express')
const socketIo = require('socket.io')
const needle = require('needle')
const config = require('dotenv').config()
const TOKEN = process.env.TWITTER_BEARER_TOKEN
const PORT = 3000

const app = express()

const server = http.createServer(app)
const io = socketIo(server)

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'))
})

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id'

// You can edit the value for what you want like tweets from some user or just using the keyword about something
// You can change the value name to "tag : someHashtag" or both together like [{value: "from:Casimiro"}, {tag: "VASCO"}]
const rules = [{value: "poze"}]

//Get stream rules
async function getRules(){
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    })    
    return response.body
}

//Set stream rules
async function setRules(){
    const data = {
        add: rules
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        },
    })
    return response.body
}

//Delete stream rules
async function deleteRules(rules){
    if(!Array.isArray(rules.data)){
        return null
    }
    
    const ids = rules.data.map((rule) => rule.id)

    const data = {
        delete: {
            ids: ids
        }
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        },
    })
    return response.body
}

//Stream tweets with the params setted above
function streamTweets(socket){
    const stream = needle.get(streamURL,{
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    })
    stream.on('data', (data) => {
        try{
            const json = JSON.parse(data)
            // console.log(json)
            socket.emit('tweet', json)
        }catch(error){

        }
    })
}

//Starts the connection with socket
io.on('connection', async() => {
    console.log('client connected')
         let currentRules
    
     try{
         //Get all stream rules
         currentRules = await getRules()
         //Delete all stream rules
         await deleteRules(currentRules)
         //Set rules based on array above
         await setRules()
        
     } catch(error){
         console.error(error)
         process.exit(1)
     }

     streamTweets(io)
})

//the other way to make stream happens without socket
// (async () => {
//     let currentRules
    
//     try{
//         //Get all stream rules
//         currentRules = await getRules()
//         //Delete all stream rules
//         await deleteRules(currentRules)
//         //Set rules based on array above
//         await setRules()
        
//     } catch(error){
//         console.error(error)
//         process.exit(1)
//     }

//     streamTweets()
// }) ()

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))