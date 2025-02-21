import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { Button, Card, CardContent, Input, Typography } from "@mui/material";

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
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <Typography variant="h4" gutterBottom>TrueMFA</Typography>
      <Input
        placeholder="Issuer (Website Name)"
        value={issuer}
        onChange={(e) => setIssuer(e.target.value)}
        fullWidth
        style={{ marginBottom: '10px' }}
      />
      <Input
        placeholder="Account Name (Email/Username)"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        fullWidth
        style={{ marginBottom: '10px' }}
      />
      <Input
        placeholder="TOTP Secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        fullWidth
        style={{ marginBottom: '10px' }}
      />
      <Button variant="contained" color="primary" fullWidth onClick={handleAddToken}>
        Save TOTP Code
      </Button>
      <div style={{ marginTop: '20px' }}>
        <Typography variant="h6">Saved TOTP Tokens</Typography>
        <Typography variant="body2">Next refresh in: {timeLeft}s</Typography>
        {tokens.map((token) => (
          <Card key={token.id} style={{ marginTop: '10px', padding: '10px' }}>
            <CardContent>
              <Typography variant="subtitle1"><strong>Issuer:</strong> {token.issuer}</Typography>
              <Typography variant="subtitle1"><strong>Account:</strong> {token.account}</Typography>
              <Typography variant="h6" color="primary"><strong>Current TOTP Code:</strong> {token.currentTOTP || 'Loading...'}</Typography>
              <Button variant="outlined" color="secondary" fullWidth onClick={() => handleDeleteToken(token.id)}>
                Delete Token
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
