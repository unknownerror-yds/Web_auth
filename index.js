// //this will consist of our server...
// //this will do the authentication process and the credintial part...
// //for this project we won't be using a database - will use the in memory ...
// //but for prod we use a DB...
// const express =  require('express')
// //crypto module...
// const crypto = require("node:crypto");
// const { generateRegistrationOptions, verifyRegistrationResponse, verifyAuthenticationResponse, generateAuthenticationOptions } = require('@simplewebauthn/server');
// const { cursorTo } = require('node:readline');

// if(!globalThis.crypto){
//     globalThis.crypto = crypto;
// }

// const PORT = 3000
// const app = express();

// //middleware...
// app.use(express.static('./public'))
// app.use(express.json())

// //Usertable...
// const Usertable = {}
// //we will also store the challenge which we have created...
// const Challengetable = {}

// //Routes...
// //since we don't have any data base we will use inmemory...
// app.post('/register', (req,res) => {
//     const {username, password} = req.body
//     const id = `user_${Date.now()}`

//     const user = {
//         id,
//         username,
//         password
//     }

//     Usertable[id] = user

//     //check point...
//     console.log('User Registeration Successfull',Usertable[id])

//     return res.json({id})
// })

// app.post('/register-challenge', async (req, res) => {
    
//     const { userId } = req.body

//     if(!Usertable[userId])
//         return res.status(404).json({error: 'User not found'})

//     const user = Usertable[userId]
    
//     const challenge_payload = await generateRegistrationOptions({
//         //your frontend is on which domain...
//         rpID: 'localhost',
//         rpName: 'My LocalHost Machine',
//         userName: user.username
//     })

//     Challengetable[userId] = challenge_payload.challenge

//     return res.json({ options: challenge_payload})
// })

// app.post('/register-verify', async (req, res) => {
//     const { userId, cred }  = req.body
    
//     if (!Usertable[userId]) 
//         return res.status(404).json({ error: 'user not found!' })

//     const user = Usertable[userId]
//     const challenge = Challengetable[userId]

//     const verificationResult = await verifyRegistrationResponse({
//         expectedChallenge: challenge,
//         expectedOrigin: 'http://localhost:3000',
//         expectedRPID: 'localhost',
//         response: cred,
//     })

//     if (!verificationResult.verified) 
//         return res.json({ error: 'could not verify' });
//     Usertable[userId].passkey = verificationResult.registrationInfo

//     return res.json({ verified: true })

// })

// app.post('/login-challenge', async (req,res) =>{
//     const { userId } = req.body
//     if(!Usertable[userId])
//         return res.status(404).json({error: 'User not found'})

//     const option = await generateAuthenticationOptions({
//         rpID: 'localhost'
//     })
//     Challengetable[userId] = option.challenge

//     return res.json({options: option})
// })

// app.post('login-verfify', async (req,res) => {
//     const { userId, cred }  = req.body

//     if (!Usertable[userId]) return res.status(404).json({ error: 'user not found!' })
//     const user = Usertable[userId]
//     const challenge = Challengetable[userId]

//     const result = await verifyAuthenticationResponse({
//         expectedChallenge: challenge,
//         expectedOrigin: 'http://localhost:3000',
//         expectedRPID: 'localhost',
//         response: cred,
//         authenticator: user.passkey
//     })

//     if (!result.verified) return res.json({ error: 'something went wrong' })
    
//     // Login the user: Session, Cookies, JWT
//     return res.json({ success: true, userId })
// })

// app.listen(PORT, () => console.log(`Server started on PORT:${PORT}`))
const express = require('express')
const crypto = require("node:crypto");
const { 
    generateRegistrationOptions, 
    verifyRegistrationResponse, 
    generateAuthenticationOptions, 
    verifyAuthenticationResponse 
} = require('@simplewebauthn/server')


if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}

const PORT = 3000
const app = express();

app.use(express.static('./public'))
app.use(express.json())

// States
const userStore = {}
const challengeStore = {}

app.post('/register', (req, res) => {
    const { username, password } = req.body
    const id = `user_${Date.now()}`

    const user = {
        id,
        username,
        password
    }

    userStore[id] = user

    console.log(`Register successfull`, userStore[id])

    return res.json({ id })

})

app.post('/register-challenge', async (req, res) => {
    const { userId } = req.body

    if (!userStore[userId]) return res.status(404).json({ error: 'user not found!' })

    const user = userStore[userId]

    const challengePayload = await generateRegistrationOptions({
        rpID: 'localhost',
        rpName: 'My Localhost Machine',
        attestationType: 'none',
        userName: user.username,
        timeout: 30_000,
    })

    challengeStore[userId] = challengePayload.challenge

    return res.json({ options: challengePayload })

})

app.post('/register-verify', async (req, res) => {
    const { userId, cred }  = req.body
    
    if (!userStore[userId]) return res.status(404).json({ error: 'user not found!' })

    const user = userStore[userId]
    const challenge = challengeStore[userId]

    const verificationResult = await verifyRegistrationResponse({
        expectedChallenge: challenge,
        expectedOrigin: 'http://localhost:3000',
        expectedRPID: 'localhost',
        response: cred,
    })

    if (!verificationResult.verified) return res.json({ error: 'could not verify' });
    userStore[userId].passkey = verificationResult.registrationInfo

    return res.json({ verified: true })

})

app.post('/login-challenge', async (req, res) => {
    const { userId } = req.body
    if (!userStore[userId]) return res.status(404).json({ error: 'user not found!' })
    
    const opts = await generateAuthenticationOptions({
        rpID: 'localhost',
    })

    challengeStore[userId] = opts.challenge

    return res.json({ options: opts })
})


app.post('/login-verify', async (req, res) => {
    const { userId, cred }  = req.body

    if (!userStore[userId]) return res.status(404).json({ error: 'user not found!' })
    const user = userStore[userId]
    const challenge = challengeStore[userId]

    const result = await verifyAuthenticationResponse({
        expectedChallenge: challenge,
        expectedOrigin: 'http://localhost:3000',
        expectedRPID: 'localhost',
        response: cred,
        authenticator: user.passkey
    })

    if (!result.verified) return res.json({ error: 'something went wrong' })
    
    // Login the user: Session, Cookies, JWT
    return res.json({ success: true, userId })
})


app.listen(PORT, () => console.log(`Server started on PORT:${PORT}`))