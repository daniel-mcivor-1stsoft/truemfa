import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { QRCodeSVG } from 'qrcode.react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TrueMFA() {
  const [tokens, setTokens] = useState([]);
  const [account, setAccount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [secret, setSecret] = useState('');

  useEffect(() => {
    const fetchTokens = async () => {
      let { data, error } = await supabase.from('totp_tokens').select('*');
      if (error) console.error(error);
      else setTokens(data);
    };
    fetchTokens();
  }, []);

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
    setSecret('');
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">TrueMFA</h1>
      <Card>
        <CardContent>
          <Input
            placeholder="Issuer (Website Name)"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
          <Input
            placeholder="Account Name (Email/Username)"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          <Input
            placeholder="TOTP Secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <Button onClick={handleAddToken}>Save TOTP Code</Button>
        </CardContent>
      </Card>
      <div className="mt-4">
        <h2 className="text-xl font-bold">Saved TOTP Tokens</h2>
        {tokens.map((token, index) => (
          <Card key={index} className="mt-2">
            <CardContent>
              <p><strong>Issuer:</strong> {token.issuer}</p>
              <p><strong>Account:</strong> {token.account}</p>
              <p><strong>Secret:</strong> {token.secret}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
