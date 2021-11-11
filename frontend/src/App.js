import { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
    Program, Provider, web3
} from '@project-serum/anchor';
import idl from './idl.json';
import kp from './keypair.json';

// Constants
const TWITTER_HANDLE = 'bidhantheroy';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
    'https://media.giphy.com/media/3o7abAHdYvZdBNnGZq/giphy.gif',
    'https://media.giphy.com/media/9rtpurjbqiqZXbBBet/giphy.gif',
    'https://media.giphy.com/media/aiE3JQU3vLqTK/giphy.gif',
    'https://media.giphy.com/media/11syU6ZZ6PsGRO/giphy.gif'
]

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
    preflightCommitment: "processed"
}


const App = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [gifList, setGifList] = useState([]);

    const isWalletConnected = async () => {
        try {
            const { solana } = window;

            if (solana && solana.isPhantom) {
                console.log("Phantom wallet found!");

                const response = await solana.connect({ onlyIfTrusted: true })

                console.log('Connected with Public Key:', response.publicKey.toString());

                setWalletAddress(response.publicKey.toString());
            }
        } catch (error) {
            console.error('Got this error: ', error);
        }
    };

    const connectWallet = async () => {
        const { solana } = window;

        if (solana) {
            const response = await solana.connect();
            console.log('Connected with Public Key:', response.publicKey.toString());
            setWalletAddress(response.publicKey.toString());
        }
    };

    const sendGif = async () => {
        if (inputValue.length === 0) {
            console.log("No gif link given!")
            return
        }
        console.log('Gif link:', inputValue);
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);

            await program.rpc.addGif(inputValue, {
            accounts: {
                baseAccount: baseAccount.publicKey,
                user: provider.wallet.publicKey,
            },
            });
            console.log("GIF sucesfully sent to program", inputValue)

            await getGifList();
        } catch (error) {
            console.log("Error sending GIF:", error)
        }
    };

    const onInputChange = (event) => {
        const { value } = event.target;
        setInputValue(value);
    };

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new Provider(
            connection, window.solana, opts.preflightCommitment,
        );
        return provider;
    }

    const createGifAccount = async () => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            console.log("ping")
            await program.rpc.startStuffOff({
                accounts: {
                    baseAccount: baseAccount.publicKey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [baseAccount]
            });
            console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
            await getGifList();

        } catch (error) {
            console.log("Error creating BaseAccount account:", error)
        }
    }

    const renderNotConnectedContainer = () => (
        <button
            className="cta-button connect-wallet-button"
            onClick={connectWallet}
        >
            Connect to Wallet
        </button>
    );

    const renderConnectedContainer = () => {
        // If we hit this, it means the program account hasn't be initialized.
        if (gifList === null) {
            return (
                <div className="connected-container">
                    <button className="cta-button submit-gif-button" onClick={createGifAccount}>
                        Do One-Time Initialization For GIF Program Account
        </button>
                </div>
            )
        }
        // Otherwise, we're good! Account exists. User can submit GIFs.
        else {
            return (
                <div className="connected-container">
                    <input
                        type="text"
                        placeholder="Enter gif link!"
                        value={inputValue}
                        onChange={onInputChange}
                    />
                    <button className="cta-button submit-gif-button" onClick={sendGif}>
                        Submit
        </button>
                    <div className="gif-grid">
                        {/* We use index as the key instead, also, the src is now item.gifLink */}
                        {gifList.map((item, index) => (
                            <div className="gif-item" key={index}>
                                <img src={item.gifLink} />
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
    }

    useEffect(() => {
        window.addEventListener('load', async (event) => {
            await isWalletConnected();
        });

    }, []);

    const getGifList = async () => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

            console.log("Got the account", account)
            setGifList(account.gifList)

        } catch (error) {
            console.log("Error in getGifs: ", error)
            setGifList(null);
        }
    }

    useEffect(() => {
        if (!walletAddress) {
            return;
        }

        console.log("Fetching GIF list...");
        getGifList();
        //setGifList(TEST_GIFS);
    }, [walletAddress]);

    return (
        <div className="App">
            {/* This was solely added for some styling fanciness */}
            <div className={walletAddress ? 'authed-container' : 'container'}>
                <div className="container">
                    <div className="header-container">
                        <p className="header">🖼 Dog GIF Portal</p>
                        <p className="sub-text">
                            View your Dog game themed GIF collection in the metaverse ✨
          </p>
                        {!walletAddress && renderNotConnectedContainer()}
                        {walletAddress && renderConnectedContainer()}
                    </div>
                    <div className="footer-container">
                        <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
                        <a
                            className="footer-text"
                            href={TWITTER_LINK}
                            target="_blank"
                            rel="noreferrer"
                        >{`built by @${TWITTER_HANDLE}`}</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
