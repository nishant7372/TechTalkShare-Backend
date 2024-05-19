# TechTalkShare Backend Server

## Installation

1. Clone the repository:

```
git clone https://github.com/nishant7372/TechTalkShare-Backend.git
cd TechTalkShare-Backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file for environment variables and add your configuration. For development, you can create a `dev.env` file inside the `config` directory.

4. (Optional) If you're using MongoDB locally, make sure it's running. For a cloud solution, ensure your connection string is correct in the `.env` file.

## Usage

### Development

To run the application in development mode with live reloading:

```bash
npm run dev
```

### Production

To run the application in production mode:

```bash
npm start
```

or

```bash
node src/index.js
```

## Scripts

- **start**: Runs the application using \`node src/index.js\`.
- **dev**: Runs the application in development mode using \`nodemon\` and \`env-cmd\` to load environment variables from \`config/dev.env\`.

## Dependencies

- **bcryptjs**: ^2.4.3
- **bull**: ^4.10.4
- **chromium**: ^3.0.3
- **cors**: ^2.8.5
- **express**: ^4.18.2
- **html-to-md**: ^0.8.3
- **jsonwebtoken**: ^9.0.0
- **mongodb**: ^5.0.1
- **mongoose**: ^6.9.2
- **multer**: ^1.4.5-lts.1
- **puppeteer**: ^20.5.0
- **puppeteer-chromium-resolver**: ^20.0.0
- **puppeteer-core**: ^20.5.0
- **sharp**: ^0.31.3
- **socket.io**: ^4.6.2
- **valid-url**: ^1.0.9
- **validator**: ^13.9.0

## Dev Dependencies

- **env-cmd**: ^10.1.0
- **nodemon**: ^2.0.20

## Contributing

1. Fork the repository.
2. Create a new branch (\`git checkout -b feature-branch\`).
3. Make your changes.
4. Commit your changes (\`git commit -m 'Add new feature'\`).
5. Push to the branch (\`git push origin feature-branch\`).
6. Create a new Pull Request.

## License

This project is licensed under the ISC License.
