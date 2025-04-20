# Markdown & LaTeX Preview

a markdown previewer and support MathJax

# work with python

```py
import base64
import urllib.parse
import requests

API_URL = "https://dpaste.org/api/"


def upload_to_dpaste_raw(
    content: str,
    lexer: str = "",
    expires: str = "86400",  # default 1day
    filename: str = "",
) -> str:
    data = {
        "content": content,
        "format": "url",
        "expires": expires,
    }
    if lexer:
        data["lexer"] = lexer
    if filename:
        data["filename"] = filename

    response = requests.post(API_URL, data=data)
    response.raise_for_status()
    url = response.text.strip()
    return f"{url}/raw"


def encode_preview_md(md: str):
    uri_encoded = urllib.parse.quote(md, safe="~()*!.'")
    base64_encoded = base64.b64encode(uri_encoded.encode("latin1")).decode("ascii")
    return base64_encoded


def get_preview_link(md: str) -> str:
    base64_encoded = encode_preview_md(md)
    if len(base64_encoded) < 4096:
        return f"https://lenml.github.io/page-tools/mathjax-md-preview/?mdText={base64_encoded}"
    # NOTE: uncomment the following line if you want to use dpaste
    raise ValueError("md is too long")
    mdUrl = upload_to_dpaste_raw(md)
    return f"https://lenml.github.io/page-tools/mathjax-md-preview/?mdUrl={mdUrl}"


markdown_content = r"""
Question:
Please reason step by step, and put your final answer within $\boxed{}$.

Caleb is 31 years old today. In 3 years, he will be 2-times as old as his nephew. How old is his nephew today?

Answer:   14.0

Response:
To solve the problem step by step, let's define the current ages and set up the equations accordingly.

1. **Define the unknown:**
   - Let \( x \) be the current age of Caleb's nephew.

2. **Current ages:**
   - Caleb is 31 years old today.
   - His nephew is \( x \) years old today.

3. **Future ages:**
   - In 3 years, Caleb will be \( 31 + 3 = 34 \) years old.
   - In 3 years, his nephew will be \( x + 3 \) years old.

4. **Set up the equation:**
   - According to the problem, in 3 years, Caleb will be 2 times as old as his nephew.
   - This can be written as the equation:
     \[
     34 = 2(x + 3)
     \]

5. **Solve the equation:**
   - First, distribute the 2 on the right side:
     \[
     34 = 2x + 6
     \]
   - Next, isolate the term with \( x \) by subtracting 6 from both sides:
     \[
     34 - 6 = 2x
     \]
     \[
     28 = 2x
     \]
   - Finally, solve for \( x \) by dividing both sides by 2:
     \[
     x = \frac{28}{2}
     \]
     \[
     x = 14
     \]

6. **Conclusion:**
   - Caleb's nephew is currently 14 years old.

Thus, Caleb's nephew is \(\boxed{14}\) years old today.
"""

link = get_preview_link(markdown_content)
print(link)
```

output

```
https://lenml.github.io/page-tools/mathjax-md-preview/?mdText=JTBBUXVlc3Rpb24lM0ElMjAlMjAlMEFQbGVhc2UlMjByZWFzb24lMjBzdGVwJTIwYnklMjBzdGVwJTJDJTIwYW5kJTIwcHV0JTIweW91ciUyMGZpbmFsJTIwYW5zd2VyJTIwd2l0aGluJTIwJTI0JTVDYm94ZWQlN0IlN0QlMjQuJTBBJTBBQ2FsZWIlMjBpcyUyMDMxJTIweWVhcnMlMjBvbGQlMjB0b2RheS4lMjBJbiUyMDMlMjB5ZWFycyUyQyUyMGhlJTIwd2lsbCUyMGJlJTIwMi10aW1lcyUyMGFzJTIwb2xkJTIwYXMlMjBoaXMlMjBuZXBoZXcuJTIwSG93JTIwb2xkJTIwaXMlMjBoaXMlMjBuZXBoZXclMjB0b2RheSUzRiUyMCUyMCUwQSUwQUFuc3dlciUzQSUyMCUyMCUyMDE0LjAlMjAlMjAlMEElMEFSZXNwb25zZSUzQSUyMCUyMCUyMCUwQVRvJTIwc29sdmUlMjB0aGUlMjBwcm9ibGVtJTIwc3RlcCUyMGJ5JTIwc3RlcCUyQyUyMGxldCdzJTIwZGVmaW5lJTIwdGhlJTIwY3VycmVudCUyMGFnZXMlMjBhbmQlMjBzZXQlMjB1cCUyMHRoZSUyMGVxdWF0aW9ucyUyMGFjY29yZGluZ2x5LiUwQSUwQTEuJTIwKipEZWZpbmUlMjB0aGUlMjB1bmtub3duJTNBKiolMEElMjAlMjAlMjAtJTIwTGV0JTIwJTVDKCUyMHglMjAlNUMpJTIwYmUlMjB0aGUlMjBjdXJyZW50JTIwYWdlJTIwb2YlMjBDYWxlYidzJTIwbmVwaGV3LiUwQSUwQTIuJTIwKipDdXJyZW50JTIwYWdlcyUzQSoqJTBBJTIwJTIwJTIwLSUyMENhbGViJTIwaXMlMjAzMSUyMHllYXJzJTIwb2xkJTIwdG9kYXkuJTBBJTIwJTIwJTIwLSUyMEhpcyUyMG5lcGhldyUyMGlzJTIwJTVDKCUyMHglMjAlNUMpJTIweWVhcnMlMjBvbGQlMjB0b2RheS4lMEElMEEzLiUyMCoqRnV0dXJlJTIwYWdlcyUzQSoqJTBBJTIwJTIwJTIwLSUyMEluJTIwMyUyMHllYXJzJTJDJTIwQ2FsZWIlMjB3aWxsJTIwYmUlMjAlNUMoJTIwMzElMjAlMkIlMjAzJTIwJTNEJTIwMzQlMjAlNUMpJTIweWVhcnMlMjBvbGQuJTBBJTIwJTIwJTIwLSUyMEluJTIwMyUyMHllYXJzJTJDJTIwaGlzJTIwbmVwaGV3JTIwd2lsbCUyMGJlJTIwJTVDKCUyMHglMjAlMkIlMjAzJTIwJTVDKSUyMHllYXJzJTIwb2xkLiUwQSUwQTQuJTIwKipTZXQlMjB1cCUyMHRoZSUyMGVxdWF0aW9uJTNBKiolMEElMjAlMjAlMjAtJTIwQWNjb3JkaW5nJTIwdG8lMjB0aGUlMjBwcm9ibGVtJTJDJTIwaW4lMjAzJTIweWVhcnMlMkMlMjBDYWxlYiUyMHdpbGwlMjBiZSUyMDIlMjB0aW1lcyUyMGFzJTIwb2xkJTIwYXMlMjBoaXMlMjBuZXBoZXcuJTBBJTIwJTIwJTIwLSUyMFRoaXMlMjBjYW4lMjBiZSUyMHdyaXR0ZW4lMjBhcyUyMHRoZSUyMGVxdWF0aW9uJTNBJTBBJTIwJTIwJTIwJTIwJTIwJTVDJTVCJTBBJTIwJTIwJTIwJTIwJTIwMzQlMjAlM0QlMjAyKHglMjAlMkIlMjAzKSUwQSUyMCUyMCUyMCUyMCUyMCU1QyU1RCUwQSUwQTUuJTIwKipTb2x2ZSUyMHRoZSUyMGVxdWF0aW9uJTNBKiolMEElMjAlMjAlMjAtJTIwRmlyc3QlMkMlMjBkaXN0cmlidXRlJTIwdGhlJTIwMiUyMG9uJTIwdGhlJTIwcmlnaHQlMjBzaWRlJTNBJTBBJTIwJTIwJTIwJTIwJTIwJTVDJTVCJTBBJTIwJTIwJTIwJTIwJTIwMzQlMjAlM0QlMjAyeCUyMCUyQiUyMDYlMEElMjAlMjAlMjAlMjAlMjAlNUMlNUQlMEElMjAlMjAlMjAtJTIwTmV4dCUyQyUyMGlzb2xhdGUlMjB0aGUlMjB0ZXJtJTIwd2l0aCUyMCU1QyglMjB4JTIwJTVDKSUyMGJ5JTIwc3VidHJhY3RpbmclMjA2JTIwZnJvbSUyMGJvdGglMjBzaWRlcyUzQSUwQSUyMCUyMCUyMCUyMCUyMCU1QyU1QiUwQSUyMCUyMCUyMCUyMCUyMDM0JTIwLSUyMDYlMjAlM0QlMjAyeCUwQSUyMCUyMCUyMCUyMCUyMCU1QyU1RCUwQSUyMCUyMCUyMCUyMCUyMCU1QyU1QiUwQSUyMCUyMCUyMCUyMCUyMDI4JTIwJTNEJTIwMnglMEElMjAlMjAlMjAlMjAlMjAlNUMlNUQlMEElMjAlMjAlMjAtJTIwRmluYWxseSUyQyUyMHNvbHZlJTIwZm9yJTIwJTVDKCUyMHglMjAlNUMpJTIwYnklMjBkaXZpZGluZyUyMGJvdGglMjBzaWRlcyUyMGJ5JTIwMiUzQSUwQSUyMCUyMCUyMCUyMCUyMCU1QyU1QiUwQSUyMCUyMCUyMCUyMCUyMHglMjAlM0QlMjAlNUNmcmFjJTdCMjglN0QlN0IyJTdEJTBBJTIwJTIwJTIwJTIwJTIwJTVDJTVEJTBBJTIwJTIwJTIwJTIwJTIwJTVDJTVCJTBBJTIwJTIwJTIwJTIwJTIweCUyMCUzRCUyMDE0JTBBJTIwJTIwJTIwJTIwJTIwJTVDJTVEJTBBJTBBNi4lMjAqKkNvbmNsdXNpb24lM0EqKiUwQSUyMCUyMCUyMC0lMjBDYWxlYidzJTIwbmVwaGV3JTIwaXMlMjBjdXJyZW50bHklMjAxNCUyMHllYXJzJTIwb2xkLiUwQSUwQVRodXMlMkMlMjBDYWxlYidzJTIwbmVwaGV3JTIwaXMlMjAlNUMoJTVDYm94ZWQlN0IxNCU3RCU1QyklMjB5ZWFycyUyMG9sZCUyMHRvZGF5LiUwQQ==
```
