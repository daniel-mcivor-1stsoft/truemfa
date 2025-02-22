import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { Button, Card, CardContent, Input, Typography, IconButton, Container, Paper, Grid, TextField, AppBar, Toolbar, Box } from "@mui/material";
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
        if (!user) {
          setLoading(false);
          if (router.pathname !== "/auth") {
            router.replace("/auth");
          }
        } else {
          setUser(user);
          setLoading(false);
          fetchTokens();
        }
      } catch (error) {
        setLoading(false);
        if (router.pathname !== "/auth") {
          router.replace("/auth");
        }
      }
    };
    checkAuth();
  }, []);

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

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/auth");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleAddToken = async () => {
    if (!account || !issuer || !secret) {
      alert('Please enter all fields');
      return;
    }
    const formattedSecret = secret.replace(/\s+/g, '').toUpperCase();
    let { data, error } = await supabase.from('totp_tokens').insert([{ account, issuer, secret: formattedSecret }]);
    if (error) console.error(error);
    else fetchTokens();
    setAccount('');
    setIssuer('');
    setSecret('');
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Container maxWidth="md">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>TrueMFA</Typography>
          <Button color="inherit" onClick={handleSignOut}>Sign Out</Button>
        </Toolbar>
      </AppBar>

      <Paper elevation={3} style={{ padding: "20px", marginTop: "20px", borderRadius: "12px" }}>
        <Typography variant="h5" align="center" gutterBottom>Manage Your TOTP Tokens</Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Issuer (Website Name)" variant="outlined" fullWidth value={issuer} onChange={(e) => setIssuer(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Account Name (Email/Username)" variant="outlined" fullWidth value={account} onChange={(e) => setAccount(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="TOTP Secret" variant="outlined" fullWidth value={secret} onChange={(e) => setSecret(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" fullWidth onClick={handleAddToken}>Save TOTP Code</Button>
          </Grid>
        </Grid>
      </Paper>

      <Box mt={3}>
        <Typography variant="h6" gutterBottom>Saved TOTP Tokens</Typography>
        <Typography variant="body2">Next refresh in: {timeLeft}s</Typography>
        {tokens.map((token) => (
          <Card key={token.id} elevation={2} style={{ marginTop: "10px", padding: "10px", borderRadius: "10px" }}>
            <CardContent>
              <Typography variant="subtitle1"><strong>Issuer:</strong> {token.issuer}</Typography>
              <Typography variant="subtitle1"><strong>Account:</strong> {token.account}</Typography>
              <Typography variant="h6" color="primary">
                <strong>Current TOTP Code:</strong> {token.currentTOTP || 'Loading...'}
                <IconButton onClick={() => navigator.clipboard.writeText(token.currentTOTP)}>
                  <ContentCopyIcon />
                </IconButton>
              </Typography>
              <Button variant="outlined" color="secondary" fullWidth onClick={() => handleDeleteToken(token.id)}>Delete Token</Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
