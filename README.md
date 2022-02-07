# PageSpeed CLI and History

## Description

A CLI tool that uses the Google PageSpeed insights API to generate analytics information for a provided site. The tool also saves reports from each analytics request on a per-domain basis, so historical data can be retrieved and summarized.

## Usage

After running `npm i`:

`./index.js --usage` will give a list of available commands.  

## Examples

Get analytics data for http://www.example.com and http://www.example2.com

```
./index.js get-analytics --url http://www.example.com --url http://www.example2.com

```

Compare analytics data for http://www.example.com and http://www.example2.com

```
./index.js get-analytics --compare --url http://www.example.com --url http://www.example2.com
```

Get historical analytic data for http://www.example.com and http://www.example2.com

```
./index.js show-history --url http://www.example.com --url http://www.example2.com

```

Compare historical data for http://www.example.com and http://www.example2.com

```
./index.js show-history --compare --url http://www.example.com --url http://www.example2.com
```


## Under the hood

PageSpeed CLI and History works by creating a `_data.json` file in the `/data/` directory to store key/value pairs representing a domain and its records. This file is untracked by git.
