// Old code, lets resurrect creating tunnel once users need it.

// import { createTunnel, closeTunnel } from 'proxy-chain';
// import * as ping from 'ping';
// import * as hostile from 'hostile';

// export function maybeCreateProxyTunnel(proxyUrl, mongoUrl) {
//     let tunnels = null;
//     let match = mongoUrl.match(/(mongodb):\/\/(.*)@([^/]*)\/?(.*)/); // v3.4 mongo string
//     if (!match) match = mongoUrl.match(/(mongodb\+srv):\/\/(.*)@([^/]*)\/?(.*)/); // v3.6 mongo string
//     if (match) {
//         const [wholeString, protocol, credentials, host, additionalDetails] = match;
//         const pureHostnames = [];
//         const hosts = host.split(',').map(host => {
//             const [hostname, port] = host.split(':');
//             pureHostnames.push(hostname);
//             if (port == 2) return host;
//             else return `${host}:27017`; // default mongodb port is 27017 and is omited from basic 3.6 string
//         });
//
//         tunnels = await Promise.map(hosts, (host) => createTunnel(input.proxyUrl, host))
//
//         if (!process.env.KEEP_HOSTS) {
//             // add item to /etc/hosts
//             await new Promise((resolve, reject) => {
//                 hostile.set('127.0.0.1', pureHostnames.join(' '), (err) => {
//                     if (err) return reject(err);
//                     return resolve();
//                 })
//             });
//
//             // Test connectivity to proxy
//             await Promise.all(pureHostnames.map(async (hostname) => {
//                 const data = await ping.promise.probe(hostname);
//                 console.log('Connecting to ip', data.numeric_host);
//                 console.log('Host is alive', data.alive);
//             }));
//         }
//
//         const transformedTunnels = tunnels.map((tunnel, i) => tunnel.replace('localhost', pureHostnames[i])).join(',');
//         mongoUrl = `${protocol}://${credentials}@${transformedTunnels}${additionalDetails ? `/${additionalDetails}` : '' }`;
//     }
//     return {
//         mongoUrl,
//         tunnels
//     }
// }
