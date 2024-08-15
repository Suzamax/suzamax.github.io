---
title: "How to create the smallest images for Docker/Podman"
date: 2024-08-15
description: "An example with a C Hello World!"
tags: ["podman", "docker", "C", "kubernetes"]
categories: ["tutorials"]
series:
  - "Tutorials"
---

This is a tutorial to create a so small container image. The example is for a C hello world but it should work i.e, in more complex Golang programs.

## Setup

An editor, a container runtime and two minutes. in this case I will use Zed as my main IDE-like editor and Podman as the container manager. You could use VSCode, Docker, Notepad++, Sublime, whatever...

## The program

Easy, a hello world:

```c
#include <stdio.h>

int main (void) {
    char * helloworld = "Hello World!\n";
    printf("%s", helloworld);
    return 0;
}
```

## The container file

Here lies magic.

First I create a builder step. In it I will compile my program. Also, as the scratch image I will use later does **NOT** have neither binaries nor libraries inside, I have to *statically compile* the program. Also, I will set permissions to make it executable.

And when my binary with the static libraries is compiled I will store it in a **scratch** image. This means there's *no binaries* in this system, it's only Linux kernel and run this program.
```dockerfile
FROM alpine:3.20 as builder

WORKDIR /opt
RUN apk add clang musl-dev slirp4netns

COPY prueba.c /opt/prueba.c
RUN gcc -static -static-libgcc prueba.c
RUN chmod +x /opt/a.out

FROM scratch
COPY --from=builder /opt/a.out /prueba
CMD ["/prueba"]
```

## Build and run

```bash
cd ./<your-project>/
buildah build . -t example-binary
podman run example-binary
```

The output should be "Hello World!" and a new line.

## Conclusion

When it comes to save space and resources within your containers and your orchestration clusters, the first idea is to avoid mounting a whole operating system in the container, if you could.

If your program is compiled, congratulations, you're eligible to perform this action.

Also, keep in mind that there are varios scenarios where you couldn't be able to do this, for example, if you have 50 binaries and they use almost all the libraries, you'd better create a monolithic architecture with shared libraries instead.

I hope this article helps you.
