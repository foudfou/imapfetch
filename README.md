# node-imapfetch

## Description

node-imapfetch is a minimalist IMAP retriever.

It connects to an IMAP server and waits for new messages, passing them to a
specified MDA.


## Usage

```bash
node index.js /path/to/config.js
```

## Install

```bash
sudo npm install -g
sudo cp imapfetch@.service /usr/lib/systemd/user
cp config.js.sample ~/.config/imapfetch/myconfig.js
systemctl --user enable imapfetch@myconfig
```

## Acknowledgement

Thanks to the excellent [node-imap](https://github.com/mscdex/node-imap) library!

## See Also

[imapnotify](https://github.com/a-sk/node-imapnotify)
