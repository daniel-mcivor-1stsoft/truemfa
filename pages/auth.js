import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { Button, Card, CardContent, Input, Typography, IconButton } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useRouter } from "next/router";
import { getUser } from "../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TrueMFA() {
  const [tokens, setTokens] = useState([]);
  const [account, setAccount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [secret, setSecret] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getUser();
        if (!user && router.pathname !== "/auth") {
          router.replace("/auth");
        } else {
          setUser(user);
          fetchTokens();
        }
      } catch (error) {
        if (router.pathname !== "/auth") {
          router.replace("/auth");
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  const fetchTokens = async () => {
    let { data, error } = await supabase.from('totp_tokens').select('*');
    if (error) console.error(error);
    else setTokens(data);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <Typography variant="h4" gutterBottom>TrueMFA</Typography>
      {user && (
        <>
          <Input placeholder="Issuer (Website Name)" value={issuer} onChange={(e) => setIssuer(e.target.value)} fullWidth style={{ marginBottom: '10px' }} />
          <Input placeholder="Account Name (Email/Username)" value={account} onChange={(e) => setAccount(e.target.value)} fullWidth style={{ marginBottom: '10px' }} />
          <Input placeholder="TOTP Secret" value={secret} onChange={(e) => setSecret(e.target.value)} fullWidth style={{ marginBottom: '10px' }} />
          <Button variant="contained" color="primary" fullWidth onClick={handleAddToken}>Save TOTP Code</Button>
          <div style={{ marginTop: '20px' }}>
            <Typography variant="h6">Saved TOTP Tokens</Typography>
            <Typography variant="body2">Next refresh in: {timeLeft}s</Typography>
            {tokens.map((token) => (
              <Card key={token.id} style={{ marginTop: '10px', padding: '10px' }}>
                <CardContent>
                  <Typography variant="subtitle1"><strong>Issuer:</strong> {token.issuer}</Typography>
                  <Typography variant="subtitle1"><strong>Account:</strong> {token.account}</Typography>
                  <Typography variant="h6" color="primary">
                    <strong>Current TOTP Code:</strong> {token.currentTOTP || 'Loading...'}
                    <IconButton onClick={() => copyToClipboard(token.currentTOTP)}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Typography>
                  <Button variant="outlined" color="secondary" fullWidth onClick={() => handleDeleteToken(token.id)}>Delete Token</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
