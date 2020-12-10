function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function r() {
  a = new Date();
  await sleep(2000);
  b = new Date();

  console.log(a, b, b - a);
}

r();
