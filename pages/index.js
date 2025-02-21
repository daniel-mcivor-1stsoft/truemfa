import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TrueMFA() {
  const [tokens, setTokens] = useState([]);
  const [account, setAccount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [secret, setSecret] = useState(authenticator.generateSecret());
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const fetchTokens = async () => {
      let { data, error } = await supabase.from('totp_tokens').select('*');
      if (error) console.error(error);
      else setTokens(data.map(token => ({ ...token, currentTOTP: '', timeLeft: 30 })));
    };
    fetchTokens();
  }, []);

  useEffect(() => {
    const updateTOTP = () => {
      // Use the local system time
      const localTime = Math.floor(Date.now() / 1000);
      const timeRemaining = 30 - (localTime % 30);
      setTimeLeft(timeRemaining);

      if (timeRemaining === 30) {
        setTokens((prevTokens) => prevTokens.map(token => ({
          ...token,
          currentTOTP: authenticator.generate(token.secret, {
            algorithm: "SHA-1",
            step: 30,
            timestamp: localTime * 1000
          })
        })));
      }
    };

    updateTOTP();
    const interval = setInterval(updateTOTP, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToken = async () => {
    if (!account || !issuer || !secret) {
      alert('Please enter all fields');
      return;
    }
    const formattedSecret = secret.replace(/\s+/g, '').toUpperCase();
    const newToken = { account, issuer, secret: formattedSecret };
    let { data, error } = await supabase.from('totp_tokens').insert(newToken).select();
    if (error) console.error(error);
    else setTokens([...tokens, { ...data[0], currentTOTP: '', timeLeft: 30 }]);
    setAccount('');
    setIssuer('');
    setSecret(authenticator.generateSecret());
  };

  const handleDeleteToken = async (id) => {
    let { error } = await supabase.from('totp_tokens').delete().eq('id', id);
    if (error) {
      console.error('Error deleting token:', error);
    } else {
      setTokens(tokens.filter(token => token.id !== id));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>TrueMFA</h1>
      <input
        type="text"
        placeholder="Issuer (Website Name)"
        value={issuer}
        onChange={(e) => setIssuer(e.target.value)}
        style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
      />
      <input
        type="text"
        placeholder="Account Name (Email/Username)"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
      />
      <input
        type="text"
        placeholder="TOTP Secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
      />
      <button
        onClick={handleAddToken}
        style={{ padding: '10px', width: '100%', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', marginTop: '10px' }}
      >
        Save TOTP Code
      </button>
      <div style={{ marginTop: '20px' }}>
        <h2>Saved TOTP Tokens</h2>
        <p>Next refresh in: {timeLeft}s</p>
        {tokens.map((token) => (
          <div key={token.id} style={{ padding: '10px', border: '1px solid #ddd', marginTop: '10px' }}>
            <p><strong>Issuer:</strong> {token.issuer}</p>
            <p><strong>Account:</strong> {token.account}</p>
            <p><strong>Current TOTP Code:</strong> {token.currentTOTP || 'Loading...'}</p>
            <button
              onClick={() => handleDeleteToken(token.id)}
              style={{ padding: '5px', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer', marginTop: '5px' }}
            >
              Delete Token
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
