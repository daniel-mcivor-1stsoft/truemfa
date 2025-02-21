import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { QRCodeSVG } from 'qrcode.react';

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
      else setTokens(data);
    };
    fetchTokens();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      setTokens((prevTokens) => [...prevTokens]); // Trigger a re-render
    }
  }, [timeLeft]);

  const handleAddToken = async () => {
    if (!account || !issuer || !secret) {
      alert('Please enter all fields');
      return;
    }
    const newToken = { account, issuer, secret };
    let { error } = await supabase.from('totp_tokens').insert(newToken);
    if (error) console.error(error);
    else setTokens([...tokens, newToken]);
    setAccount('');
    setIssuer('');
    setSecret(authenticator.generateSecret());
  };

  const generateTOTP = (secret) => {
    return authenticator.generate(secret);
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
      <QRCodeSVG value={authenticator.keyuri(account, issuer, secret)} />
      <button
        onClick={handleAddToken}
        style={{ padding: '10px', width: '100%', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', marginTop: '10px' }}
      >
        Save TOTP Code
      </button>
      <div style={{ marginTop: '20px' }}>
        <h2>Saved TOTP Tokens</h2>
        <p>Next code refresh in: {timeLeft}s</p>
        {tokens.map((token, index) => (
          <div key={index} style={{ padding: '10px', border: '1px solid #ddd', marginTop: '10px' }}>
            <p><strong>Issuer:</strong> {token.issuer}</p>
            <p><strong>Account:</strong> {token.account}</p>
            <p><strong>Current TOTP Code:</strong> {generateTOTP(token.secret)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
