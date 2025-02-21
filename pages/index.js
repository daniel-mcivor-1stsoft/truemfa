import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import { authenticator } from 'otplib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TrueMFA() {
  const [tokens, setTokens] = useState([]);
  const [account, setAccount] = useState('');
  const [secret, setSecret] = useState(authenticator.generateSecret());

  useEffect(() => {
    const fetchTokens = async () => {
      let { data, error } = await supabase.from('totp_tokens').select('*');
      if (error) console.error(error);
      else setTokens(data);
    };
    fetchTokens();
  }, []);

  const handleAddToken = async () => {
    const newToken = {
      account,
      secret
    };
    let { error } = await supabase.from('totp_tokens').insert(newToken);
    if (error) console.error(error);
    else setTokens([...tokens, newToken]);
    setAccount('');
    setSecret(authenticator.generateSecret());
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>TrueMFA</h1>
      <input
        type="text"
        placeholder="Account Name"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
      />
      <QRCodeSVG value={authenticator.keyuri(account, 'TrueMFA', secret)} />
      <button onClick={handleAddToken} style={{ display: 'block', marginTop: '10px' }}>
        Add TOTP Token
      </button>
      <div>
        <h2>Saved Tokens</h2>
        {tokens.map((token, index) => (
          <div key={index} style={{ padding: '10px', border: '1px solid #ddd', marginTop: '10px' }}>
            <p>{token.account}</p>
            <p>Secret: {token.secret}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
