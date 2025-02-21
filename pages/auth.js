import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { signInWithEmail, signUpWithEmail, getUser } from "../lib/auth";
import { Button, TextField, Typography, Container } from "@mui/material";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getUser().then((user) => {
      if (user) {
        router.replace("/"); // Redirect to index after login
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithEmail(email, password);
      router.replace("/"); // Redirect after login
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUpWithEmail(email, password);
      alert("Check your email for a confirmation link!");
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Container maxWidth="xs">
      <Typography variant="h5">Sign In / Sign Up</Typography>
      <TextField
        label="Email"
        type="email"
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button variant="contained" color="primary" fullWidth onClick={handleSignIn}>
        Sign In
      </Button>
      <Button variant="outlined" color="primary" fullWidth onClick={handleSignUp}>
        Sign Up
      </Button>
    </Container>
  );
}
